import argparse
import json
import os
import re
from datetime import datetime
from itertools import product
from pathlib import Path
from shutil import copy2, copytree, rmtree


# Constants for version strings
REGULAR_ZH = '易笺'
REGULAR_EN = 'SimpleTextReader'
VERSION_FORMAT = ' (v{})'


def update_version_in_files(new_version_str):
    """Update version number in all relevant files"""
    # Update version.json
    version_file = Path(__file__).parent.parent / 'version.json'
    with open(version_file, 'r+', encoding='utf-8') as f:
        data = json.load(f)
        data['version'] = new_version_str

        # Ensure changelog section exists
        if 'changelog' not in data:
            data['changelog'] = {}

        # If current version is not in changelog, add it
        if new_version_str not in data['changelog']:
            # Create new version entry
            new_version_entry = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'changes': {
                    'zh': [],
                    'en': []
                }
            }
            data['changelog'][new_version_str] = new_version_entry
        else:
            # Ensure existing version entry contains all necessary fields
            version_entry = data['changelog'][new_version_str]
            if 'date' not in version_entry:
                version_entry['date'] = datetime.now().strftime('%Y-%m-%d')
            if 'changes' not in version_entry:
                version_entry['changes'] = {'zh': [], 'en': []}
            elif not isinstance(version_entry['changes'], dict):
                version_entry['changes'] = {'zh': [], 'en': []}
            else:
                if 'zh' not in version_entry['changes']:
                    version_entry['changes']['zh'] = []
                if 'en' not in version_entry['changes']:
                    version_entry['changes']['en'] = []

        # Sort changelog by version number in descending order
        sorted_changelog = dict(sorted(
            data['changelog'].items(),
            key=lambda x: version_key(x[0]),
            reverse=True
        ))
        data['changelog'] = sorted_changelog

        # Write back to file
        f.seek(0)
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write('\n')
        f.truncate()

    # Patterns and templates for version strings in README files
    readme_patterns = {
        'README.md': (
            rf'{REGULAR_ZH} \(v[\d\.]+\)',  # pattern
            f'{REGULAR_ZH}{VERSION_FORMAT}'  # template
        ),
        'README_EN.md': (
            rf'{REGULAR_EN} \(v[\d\.]+\)',   # pattern
            f'{REGULAR_EN}{VERSION_FORMAT}'   # template
        )
    }

    # Update both README files with different formats
    for readme_file, (pattern, template) in readme_patterns.items():
        readme_path = Path(__file__).parent.parent / readme_file
        if readme_path.exists():
            with open(readme_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Update version only for regular version
            content = re.sub(pattern, template.format(
                new_version_str), content)

            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(content)


def version_key(version_str):
    """Converts a version string to a comparable tuple"""
    return tuple(map(int, version_str.split('.')))


def get_version(browsers):
    """Get current version from version.json or manifests"""
    # First try to get version from version.json
    version_file = Path(__file__).parent.parent / 'version.json'
    if version_file.exists():
        with open(version_file, encoding='utf-8') as f:
            return json.load(f)['version']

    # Fallback to old method if version.json doesn't exist
    version_strs = []
    for browser in browsers:
        with open(Path(__file__).parent.parent / f'client/manifests/{browser}/manifest.json', encoding='utf-8') as f:
            manifest = json.load(f)
            version_strs.append(manifest['version'])
    assert all(x == version_strs[0]
               for x in version_strs), 'Version numbers are not the same across all browsers and versions. Please fix this before building.'

    return version_strs[0]


def validate_version_str(version_str):
    """Validate version string format"""
    assert isinstance(version_str, str), 'Version string must be a string.'
    version_strs = version_str.split('.')
    assert all(x.isdigit()
               for x in version_strs), 'Version string must only contain numbers and dots.'
    return version_str


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tool to build extension')
    parser.add_argument('-v', '--version', type=str, default='',
                        help='Version of the extension to be built')
    args = parser.parse_args()

    # Define browsers and versions
    browsers = ['Chrome', 'Firefox']

    # Get version number string
    cur_version_str = get_version(browsers)
    new_version_str = cur_version_str if args.version == '' or args.version == None else args.version
    new_version_str = validate_version_str(new_version_str)
    print(f'Current Version: {cur_version_str}')
    print(f'New Version: {new_version_str}')

    # Update version in all files if version changed
    # if new_version_str != cur_version_str:
    update_version_in_files(new_version_str)

    # Prepare dist directory
    dist_dir_name = 'dist'
    dist_dir_root = Path(__file__).parent.parent / dist_dir_name
    if dist_dir_root.exists():
        rmtree(dist_dir_root)

    for browser in browsers:
        # create a dist directory for each browser/version combination
        dist_dir = dist_dir_root / f'{browser}'
        dist_dir.mkdir(parents=True, exist_ok=True)

        # modify the version field of manifest.json file
        with open(Path(__file__).parent.parent / f'client/manifests/{browser}/manifest.json', 'r+', encoding='utf-8') as f:
            data = json.load(f)
            data['version'] = new_version_str
            f.seek(0)
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.truncate()

        # copy the manifest.json file from manifests directory to the dist directory
        copy2(Path(__file__).parent.parent /
              f'client/manifests/{browser}/manifest.json', dist_dir)

        # copy other needed files to the dist directory
        copytree(Path(__file__).parent.parent / 'client/css',
                 dist_dir / 'client/css', dirs_exist_ok=True)
        copytree(Path(__file__).parent.parent / 'client/fonts',
                 dist_dir / 'client/fonts', dirs_exist_ok=True)
        copytree(Path(__file__).parent.parent / 'client/images',
                 dist_dir / 'client/images', dirs_exist_ok=True)
        copytree(Path(__file__).parent.parent / 'client/app',
                 dist_dir / 'client/app', dirs_exist_ok=True)
        rmtree(dist_dir / 'client/app' / 'debug')
        copytree(Path(__file__).parent.parent / 'shared',
                 dist_dir / 'shared', dirs_exist_ok=True)
        copy2(Path(__file__).parent.parent / 'index.html', dist_dir)
        copy2(Path(__file__).parent.parent / 'version.json', dist_dir)

        # remove font
        # os.remove(dist_dir / 'fonts' / 'FZSKBXKK.woff2')

        # remove recursively all README.md files
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file.endswith('README.md'):
                    os.remove(os.path.join(root, file))

        # zip the dist directory
        os.system(
            f'cd {Path(__file__).parent.parent.resolve()}/{dist_dir_name}/{browser} && zip -0 -r -FS ../{browser}.zip ./* --exclude "*.git*" --exclude "*.DS_Store" && cd ../..')
