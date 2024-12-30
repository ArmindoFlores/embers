import argparse
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np
import tqdm


def set_transparency(factor, file_paths):
    for file_path in tqdm(file_paths):
        try:
            # Read the image with alpha channel
            img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)

            if img is None:
                print(f"Could not read file: {file_path}")
                continue

            # Check if the image has an alpha channel
            if img.shape[2] != 4:
                continue

            # Split channels
            b, g, r, a = cv2.split(img)

            # Scale the alpha channel
            a = (a.astype(np.float32) * factor).clip(0, 255).astype(np.uint8)

            # Merge channels back
            img_output = cv2.merge([b, g, r, a])

            # Save the modified image
            cv2.imwrite(file_path, img_output)

        except Exception as e:
            print(f"Error processing {file_path}: {e}")


def apply_color_filter(hue, saturation, file_paths):
    for file_path in tqdm.tqdm(file_paths):
        try:
            # Read the image with alpha channel
            img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)

            if img is None:
                print(f"Could not read file: {file_path}")
                continue

            # Split channels
            if img.shape[2] == 4:  # RGBA image
                b, g, r, a = cv2.split(img)
            else:  # RGB image
                b, g, r = cv2.split(img)
                a = None

            # Convert to HLS
            img_hls = cv2.cvtColor(cv2.merge([b, g, r]), cv2.COLOR_BGR2HLS)
            h, l, s = cv2.split(img_hls)

            # Apply new hue and saturation
            h[:] = int(hue * 179)  # OpenCV uses 0-179 for hue
            s = cv2.multiply(s, saturation)
            s = np.clip(s, 0, 255).astype(np.uint8)

            # Merge and convert back to BGR
            img_hls = cv2.merge([h, l, s])
            img_bgr = cv2.cvtColor(img_hls, cv2.COLOR_HLS2BGR)

            # Add alpha channel back if present
            if a is not None:
                img_output = cv2.merge([img_bgr[:, :, 0], img_bgr[:, :, 1], img_bgr[:, :, 2], a])
            else:
                img_output = img_bgr

            # Save the modified image
            cv2.imwrite(file_path, img_output)

        except Exception as e:
            print(f"Error processing file {file_path}: {e}")

def create_video_from_files(output_file, tempdir):
    subprocess.run([
        "ffmpeg",
        "-framerate",
        "24",
        "-i",
        os.path.join(tempdir, "frame%04d.png"),
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        output_file
    ])

def split_into_files(input_file, tempdir):
    subprocess.run([
        "ffmpeg",
        "-vcodec",
        "libvpx",
        "-i",
        input_file,
        os.path.join(tempdir, "frame%04d.png")
    ])
    files = [os.path.join(tempdir, file) for file in os.listdir(tempdir)]
    return files

def main(args: argparse.Namespace):
    # Get the list of image files
    with tempfile.TemporaryDirectory() as tempdir:
        image_files = split_into_files(args.input_file, tempdir)

        if args.transparency:
            if args.transparency > 1 or args.transparency < 0:
                print("Invalid value for transparency: must be between 0 and 1")
                return 1
            print(f"Setting transparency to {args.transparency}")
            set_transparency(args.transparency, image_files)

        if args.color_filter:
            hue, sat = args.color_filter.split(",")
            try:
                hue = float(hue)
                sat = float(sat)
            except ValueError:
                print("Hue and saturation must be floats")
                return 1
            print(f"Applying color filter")
            apply_color_filter(hue, sat, image_files)

        create_video_from_files(args.output_file, tempdir)
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file", type=str, help="The input video file")
    parser.add_argument("output_file", type=str, help="The output video file")
    parser.add_argument("--transparency", type=float, help="Change the video transparency")
    parser.add_argument("--color-filter", type=str, help="Change the color of the video, preserving luminosity")
    args = parser.parse_args()

    sys.exit(main(args))
