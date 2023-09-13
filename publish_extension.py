import argparse
import json
import os
from itertools import product
from pathlib import Path
from shutil import copy2, copytree, rmtree


def get_version(unqiue_combinations):
    version_strs = []
    for browser, version in unqiue_combinations:
        if version == 'no-ui':
            # no-ui version doesn't receive updates any more
            continue
        with open(f'manifests/{browser}/{version}/manifest.json') as f:
            manifest = json.load(f)
            version_strs.append(manifest['version'])
    assert all(x == version_strs[0] for x in version_strs), 'Version numbers are not the same across all browsers and versions. Please fix this before publishing.'
    
    return version_strs[0]


def validate_version_str(version_str):
    assert isinstance(version_str, str), 'Version string must be a string.'
    version_strs = version_str.split('.')
    assert all(x.isdigit() for x in version_strs), 'Version string must only contain numbers and dots.'
    return version_str


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tool to publish extension')
    parser.add_argument('-v', '--version', type=str, default='', help='Version of the extension to be published')
    args = parser.parse_args()

    # Define browsers and versions
    browsers = ['Chrome', 'Firefox']
    versions = ['no-ui', 'regular']   # no-ui version doesn't receive updates any more
    unqiue_combinations = list(product(browsers, versions))
    
    # Get version number string
    cur_version_str = get_version(unqiue_combinations)
    new_version_str = cur_version_str if args.version == '' or args.version == None else args.version
    new_version_str = validate_version_str(new_version_str)
    print(f'Current Version: {cur_version_str}')
    print(f'New Version: {new_version_str}')
    
    # Prepare dist directory
    dist_dir_name = 'dist'
    dist_dir_root = Path(__file__).parent / dist_dir_name
    if dist_dir_root.exists():
        rmtree(dist_dir_root)

    for browser, version in unqiue_combinations:
        # create a dist directory for each browser/version combination
        dist_dir = dist_dir_root / f'{browser}_{version}'
        dist_dir.mkdir(parents=True, exist_ok=True)
        
        if version == 'no-ui':
            # no-ui version doesn't receive updates any more
            copytree(f'scripts_extension/{browser}/{version}', dist_dir, dirs_exist_ok=True)
            
            # zip the dist directory
            os.system(f'cd {dist_dir_name}/{browser}_{version} && zip -0 -r -FS ../{browser}_{version}.zip ./* --exclude "*.git*" --exclude "*.DS_Store" && cd ../..')

            continue
        
        # modify the version field of manifest.json file
        with open(f'manifests/{browser}/{version}/manifest.json', 'r+') as f:
            data = json.load(f)
            data['version'] = new_version_str
            f.seek(0)
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.truncate()

        # copy the manifest.json file from manifests directory to the dist directory
        copy2(f'manifests/{browser}/{version}/manifest.json', dist_dir)
        
        # copy other needed files to the dist directory
        copytree('css', dist_dir / 'css', dirs_exist_ok=True)
        copytree('fonts', dist_dir / 'fonts', dirs_exist_ok=True)
        copytree('images', dist_dir / 'images', dirs_exist_ok=True)
        copytree('scripts', dist_dir / 'scripts', dirs_exist_ok=True)
        copytree(f'scripts_extension/{browser}/{version}', dist_dir / f'scripts_extension/{browser}/{version}', dirs_exist_ok=True)
        copy2('index.html', dist_dir)
        
        # remove font
        os.remove(dist_dir / 'fonts' / 'FZSKBXKK.woff2')
        
        # zip the dist directory
        os.system(f'cd {dist_dir_name}/{browser}_{version} && zip -0 -r -FS ../{browser}_{version}.zip ./* --exclude "*.git*" --exclude "*.DS_Store" && cd ../..')
