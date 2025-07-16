import argparse
import os
import requests
import re
import sys
import json
from pathlib import Path


def fetch_css(css_url):
    """
    Fetch CSS from url or file. Replace relative font urls to be prefixed correctly.
    """
    root_dir = Path(__file__).parent.parent.resolve()
    is_remote = css_url.startswith("http://") or css_url.startswith("https://")
    if is_remote:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/css,*/*;q=0.1',
            'Referer': 'https://fontsapi.zeoseven.com/',
        }
        resp = requests.get(css_url, headers=headers)
        resp.encoding = 'utf-8'
        css_text = resp.text
        abs_prefix = css_url.replace('result.css', '')
    else:
        with open(css_url, encoding='utf-8') as f:
            css_text = f.read()
        # Get path relative to root_dir
        css_path = Path(css_url).resolve()
        rel_dir = css_path.parent.relative_to(root_dir)
        abs_prefix = './' + str(rel_dir) + '/'
        # Optional: For Windows compatibility, always use forward slash
        abs_prefix = abs_prefix.replace('\\', '/')

    # Fix relative font urls to be prefixed correctly
    css_text = re.sub(r'url\(["\']\./', f'url("{abs_prefix}', css_text)
    return css_text


def css2manifest(css_url, font_family_rename=None, size_adjust=None):
    """
    Parse CSS to manifest and optionally save a patched CSS file.
    """
    # Fetch CSS
    css_text = fetch_css(css_url)
    print(f"Fetched CSS from {css_url}")

    # Find all @font-face blocks
    blocks = re.findall(r'@font-face\s*{.*?}', css_text, flags=re.DOTALL)
    print(f"Found {len(blocks)} font-face blocks")

    # Parse each block
    manifest = []
    css_patched = css_text

    for i, block in enumerate(blocks):
        entry = {}
        # font-family
        m = re.search(r'font-family:"([^"]+)"', block)
        entry['family'] = font_family_rename or (
            m.group(1) if m else "UnknownFamily")
        # url (only woff2, first found)
        m = re.search(r'url\("([^"]+\.woff2)"\)', block)
        entry['url'] = m.group(1) if m else ""
        # unicode-range
        m = re.search(r'unicode-range:([^;]+);', block)
        entry['unicodeRange'] = m.group(1).replace(" ", "") if m else ""
        # font-weight
        m = re.search(r'font-weight:([^;]+);', block)
        entry['fontWeight'] = m.group(1).strip() if m else "normal"
        # font-style
        m = re.search(r'font-style:([^;]+);', block)
        entry['fontStyle'] = m.group(1).strip() if m else "normal"
        # font-display
        m = re.search(r'font-display:([^;]+);', block)
        entry['fontDisplay'] = m.group(1).strip() if m else "swap"
        # size-adjust
        if size_adjust:
            entry['sizeAdjust'] = size_adjust
        else:
            m = re.search(r'size-adjust:([^;]+);', block)
            if m:
                entry['sizeAdjust'] = m.group(1).strip()
        # ascent-override (rare)
        m = re.search(r'ascent-override:([^;]+);', block)
        if m:
            entry['ascentOverride'] = m.group(1).strip()

        manifest.append(entry)

        # ------ PATCHING BLOCK ------
        patched_block = block

        # patch url
        if entry['url']:
            if not (entry['url'].startswith('http://') or entry['url'].startswith('https://')):
                patched_block = re.sub(
                    r'url\("([^"]+\.woff2)"\)', f'url("{Path(entry["url"]).relative_to("./client/fonts")}")', patched_block)

        # patch font-family
        if font_family_rename:
            patched_block = re.sub(
                r'font-family:"([^"]+)"', f'font-family:"{font_family_rename}"', patched_block)
        # patch size-adjust
        if size_adjust:
            if 'size-adjust:' in patched_block:
                patched_block = re.sub(
                    r'size-adjust:([^;]+);', f'size-adjust:{size_adjust};', patched_block)
            else:
                # Insert before closing }
                patched_block = patched_block[:-1] + \
                    f'size-adjust:{size_adjust};}}'
        # (Optional: you can patch other props similarly...)

        # Replace in css_patched
        css_patched = css_patched.replace(block, patched_block)
    print(f"Parsed {len(manifest)} font-face blocks")

    return {
        "manifest": manifest,
        "css_patched": css_patched
    }


def save_manifest(manifest, out_path):
    """
    Save manifest to file.
    """
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Manifest saved to: {out_path}")


def save_css(css_text, out_path):
    """
    Save patched CSS to file.
    """
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(css_text)
    print(f"Patched CSS saved to: {out_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Convert split font CSS to JSON manifest for AdvancedFontLoaderManager."
    )
    parser.add_argument('--url', '-u', required=True,
                        help="URL or path to split font CSS")
    parser.add_argument('--out', '-o', required=True,
                        help="Output manifest path (.json)")
    parser.add_argument(
        '--rename', '-r', help="Rename font-family to this value")
    parser.add_argument('--size-adjust', '-s',
                        help="Override/add size-adjust (e.g., 125%)")
    args = parser.parse_args()

    try:
        result = css2manifest(
            args.url,
            font_family_rename=args.rename,
            size_adjust=args.size_adjust
        )
        # Save manifest JSON
        save_manifest(result['manifest'], args.out)
        # Save patched CSS
        # save_css(result['css_patched'], args.out.with_suffix('.css'))

    except Exception as e:
        print(f"Failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
