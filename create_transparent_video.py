import os
import subprocess
import sys
import tempfile

from PIL import Image


def set_transparency(factor, file_paths):
    for file_path in file_paths:
        try:
            # Open the image file
            with Image.open(file_path) as img:
                # Ensure the image has an alpha channel
                if img.mode != "RGBA":
                    print(f"Skipping {file_path}: Image does not have an alpha channel.")
                    continue

                # Split the image into R, G, B, and A components
                r, g, b, a = img.split()

                # Adjust the alpha channel
                a = a.point(lambda p: int(p * factor))

                # Merge back the channels and save the image
                new_img = Image.merge("RGBA", (r, g, b, a))
                new_img.save(file_path)
                print(f"Processed {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

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

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_transparent_video.py transparency input.webm output.webm")
        sys.exit(1)

    try:
        # Parse the transparency factor
        alpha_factor = float(sys.argv[1])
        if not (0 <= alpha_factor <= 1):
            raise ValueError("Transparency factor must be between 0 and 1.")

        # Get the list of image files
        input_file, output_file = sys.argv[2:]
        with tempfile.TemporaryDirectory() as tempdir:
            image_files = split_into_files(input_file, tempdir)
            set_transparency(alpha_factor, image_files)
            create_video_from_files(output_file, tempdir)
        
    except ValueError as ve:
        print(f"Invalid input: {ve}")
        sys.exit(1)
