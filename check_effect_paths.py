import json
import os

CURRENT_DIR = os.path.dirname(__file__)


def check_paths(effects, current_key=""):
    error_count = 0
    for effect_id, effect_value in effects.items():
        if "basename" not in effect_value:
            error_count += check_paths(effect_value, (current_key + "." if len(current_key) else "") + effect_id)
        else:
            basepath = os.path.join(CURRENT_DIR, "public/Library", effect_value["basename"])
            thumbnail_path = os.path.join(CURRENT_DIR, "public/Library", effect_value["thumbnail"])
            if not os.path.exists(thumbnail_path):
                print(f"Error: thumbnail for effect '{current_key}.{effect_id}' was not found at '{thumbnail_path}'")
                error_count += 1
            variants = effect_value["variants"]
            for variant_key, variant in variants.items():
                for i, variant_name in enumerate(variant["name"]):
                    fullpath = basepath + "_" + variant_name + ".webm"
                    if not os.path.exists(fullpath):
                        full_variant_key = f"{variant_key}[{i}]" if len(variant["name"]) > 1 else variant_key
                        print(f"Error: asset for effect '{current_key}.{effect_id}' (variant {full_variant_key}) was not found at '{fullpath}'")
                        error_count += 1
    return error_count

def main():
    with open(os.path.join(CURRENT_DIR, "src/assets/effect_record.json"), "r") as f:
        effects = json.load(f)
    
    invalid_paths = check_paths(effects)
    if invalid_paths > 0:
        print(f"Found {invalid_paths} invalid asset paths")
        quit(1)


if __name__ == "__main__":
    main()
