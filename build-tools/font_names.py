import sys
from fontTools.ttLib import TTFont


def print_font_names(font_path):
    """Print the names of a font file"""
    try:
        font = TTFont(font_path)
    except Exception as e:
        print(f"Failed to load font: {e}")
        return

    print(f"\nFont file: {font_path}")

    # The 'name' table contains many name records
    name_table = font['name']
    # We'll collect printed records to avoid duplicates
    seen = set()

    for record in name_table.names:
        # Try to decode name string safely
        try:
            value = record.toUnicode()
        except Exception:
            value = record.string.decode('utf-8', errors='replace')

        # (NameID, PlatformID, LangID) as unique identifier
        key = (record.nameID, record.platformID, record.langID, value)
        if key in seen:
            continue
        seen.add(key)

        desc = f"NameID={record.nameID}"
        if hasattr(record, 'langID'):
            desc += f", LangID={hex(record.langID)}"
        desc += f", PlatformID={record.platformID}"
        desc += f": {value}"

        print(desc)

    print("------\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python font_names.py yourfont.ttf [anotherfont.otf ...]")
        sys.exit(1)
    for path in sys.argv[1:]:
        print_font_names(path)
