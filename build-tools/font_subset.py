import argparse
import re
import json
import os
from pathlib import Path
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont


def extract_chinese_characters(files, encoding="utf-8"):
    """Extract Chinese characters from files"""
    chinese_chars = set()

    # Matches CJK Unified Ideographs
    chinese_pattern = re.compile(r'[\u4e00-\u9fff]')

    for file in files:
        if os.path.exists(file):
            with open(file, 'r', encoding=encoding) as f:
                content = f.read()
                content_chinese = chinese_pattern.findall(content)
                chinese_chars.update(content_chinese)

    return ''.join(sorted(chinese_chars))


def extract_characters(files, encoding="utf-8"):
    """Extract all characters from files"""
    characters = set()
    for file in files:
        if os.path.exists(file):
            with open(file, 'r', encoding=encoding) as f:
                content = f.read()
                characters.update(content)
    return ''.join(sorted(characters))


def subset_font_with_extra_chars(input_font, output_font, extra_chars=""):
    """Subset a font to exclude Chinese characters."""
    # Get all characters in the font and remove Chinese characters
    font = TTFont(input_font)

    # Don't subset the font if no cmap exists
    if "cmap" not in font:
        print("Error: The font file does not contain a cmap table.")
        return

    all_chars = {chr(c)
                 for table in font['cmap'].tables for c in table.cmap.keys()}
    # CJK Unified Ideographs (Basic + Extended, excluding fullwidth punctuation)
    chinese_chars = {chr(i) for i in range(0x4E00, 0x9FFF)} | \
                    {chr(i) for i in range(0x3400, 0x4DBF)} | \
                    {chr(i) for i in range(0x20000, 0x2A6DF)} | \
                    {chr(i) for i in range(0x2A700, 0x2B73F)} | \
                    {chr(i) for i in range(0x2B740, 0x2B81F)} | \
                    {chr(i) for i in range(0x2B820, 0x2CEAF)} | \
                    {chr(i) for i in range(0x2CEB0, 0x2EBEF)}

    # Fullwidth punctuation (U+FF00–U+FFEF)
    fullwidth_punctuation = {chr(i) for i in range(0xFF00, 0xFFEF)}

    # Common whitespace characters
    whitespace_chars = "".join(chr(i) for i in [0x0009, 0x000A, 0x000D, 0x0020, 0x00A0, 0x1680,
                                                0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
                                                0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F,
                                                0x205F, 0x3000])

    default_chars = "".join(sorted(
        (all_chars - chinese_chars) | fullwidth_punctuation | set(whitespace_chars)))

    if not extra_chars:
        print(
            f"Warning: No Chinese characters found in the files. Subsetting only {len(default_chars)} default characters.")

    # Combine the default characters with extracted Chinese characters
    keep_chars = "".join(sorted(set(default_chars + extra_chars)))

    print(f"Subsetting font to keep {len(keep_chars)} characters...")
    if extra_chars:
        print(
            f"Included Chinese characters ({len(extra_chars)} total): {extra_chars}...")

    # Run subsetting
    options = Options()
    options.flavor = "woff2" if output_font.suffix == ".woff2" else "woff" if output_font.suffix == ".woff" else None
    options.retain_names = True

    subsetter = Subsetter(options=options)
    subsetter.populate(text=keep_chars)
    subsetter.subset(font)
    font.save(output_font)
    print(f"Subset font saved to: {output_font}")


def subset_font(input_font, output_font, needed_chars):
    """Subset a font to exclude Chinese characters."""
    # Get all characters in the font
    font = TTFont(input_font)
    print(f"Subsetting font to keep {len(needed_chars)} characters...")
    print(
        f"Included characters ({len(needed_chars)} total): {needed_chars}...")

    # Run subsetting
    options = Options()
    options.flavor = "woff2" if output_font.suffix == ".woff2" else "woff" if output_font.suffix == ".woff" else None
    options.retain_names = True

    subsetter = Subsetter(options=options)
    subsetter.populate(text=needed_chars)
    subsetter.subset(font)
    font.save(output_font)
    print(f"Subset font saved to: {output_font}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Subset a font to exclude Chinese characters.")
    parser.add_argument(
        "input_font", help="Path to the input font file (ttf, otf, woff, woff2)")
    parser.add_argument(
        "output_font", help="Path to the output subset font file")
    parser.add_argument(
        "--chars", "-c", help="Characters to keep in the font. If specified, character extraction from input files will be skipped.")
    args = parser.parse_args()

    # Get the root directory of the project
    root_dir = Path(__file__).parent.parent.resolve()

    if args.chars:
        needed_chars = ''.join(sorted(set(args.chars)))
    else:
        # Define the files to scan
        files_to_scan = [root_dir / "./client/css/variables.css",
                         root_dir / "./help.json",
                         root_dir / "./version.json"]

        # Check if file exists
        for file in files_to_scan:
            if not file.exists():
                print(f"Error: File {file} does not exist.")
                exit(1)

        # Extract Chinese characters from files
        # chinese_chars = extract_chinese_characters(files_to_scan)
        needed_chars = extract_characters(files_to_scan)

    # Only add needed Chinese characters
    font_dir = root_dir / "./client/fonts"
    input_font = font_dir / args.input_font
    output_font = font_dir / args.output_font

    # Check if input font exists
    if not input_font.exists():
        print(f"Error: Input font {input_font} does not exist.")
        exit(1)

    # Subset the font
    # subset_font_with_extra_chars(input_font, output_font, chinese_chars)
    subset_font(input_font, output_font, needed_chars)

    # Example usage:
    # python build-tools/font_subset.py LXGWWenKaiScreen.woff2 LXGWWenKaiScreen_sub.woff2
