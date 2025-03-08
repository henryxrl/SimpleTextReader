import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from shutil import copy2, copytree, rmtree


class VersionManager:
    """
    This class is used to manage the version of the extension.
    It is used to get and update the version in the version.json file and the README files.
    """

    # Constants
    REGULAR_ZH = '易笺'
    REGULAR_EN = 'SimpleTextReader'
    VERSION_FORMAT = ' (v{})'

    def __init__(self, root_dir=None):
        self.root_dir = root_dir or Path(__file__).parent.parent.resolve()

    def update_version_in_files(self, new_version_str):
        """Update version number in all relevant files"""
        self._update_version_json(new_version_str)
        self._update_readme_files(new_version_str)

    def get_version(self, browsers):
        """Get current version from version.json or manifests"""
        # First try to get version from version.json
        version_file = self.root_dir / 'version.json'
        if version_file.exists():
            with open(version_file, encoding='utf-8') as f:
                return json.load(f)['version']

        # Fallback to old method if version.json doesn't exist
        if browsers:
            return self._get_version_from_manifests(browsers)
        return None

    def validate_version_str(self, version_str):
        """Validate version string format"""
        assert isinstance(version_str, str), 'Version string must be a string.'
        version_strs = version_str.split('.')
        assert all(x.isdigit()
                   for x in version_strs), 'Version string must only contain numbers and dots.'
        return version_str

    def _update_version_json(self, new_version_str):
        """Update version.json file"""
        version_file = self.root_dir / 'version.json'
        with open(version_file, 'r+', encoding='utf-8') as f:
            data = json.load(f)
            data['version'] = new_version_str

            # Ensure changelog section exists
            if 'changelog' not in data:
                data['changelog'] = {}

            # If current version is not in changelog, add it
            if new_version_str not in data['changelog']:
                # Create new version entry
                data['changelog'][new_version_str] = {
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'changes': {
                        'zh': [],
                        'en': []
                    }
                }
            else:
                # Ensure existing version entry contains all necessary fields
                self._ensure_changelog_structure(
                    data['changelog'][new_version_str])

            # Sort changelog by version number in descending order
            data['changelog'] = self._sort_changelog(data['changelog'])

            # Write back to file
            f.seek(0)
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.write('\n')
            f.truncate()

    def _update_readme_files(self, new_version_str):
        """Update version in README files"""
        readme_patterns = {
            'README.md': (
                rf'{self.REGULAR_ZH} \(v[\d\.]+\)',
                f'{self.REGULAR_ZH}{self.VERSION_FORMAT}'
            ),
            'README_EN.md': (
                rf'{self.REGULAR_EN} \(v[\d\.]+\)',
                f'{self.REGULAR_EN}{self.VERSION_FORMAT}'
            )
        }

        # Update both README files with different formats
        for readme_file, (pattern, template) in readme_patterns.items():
            readme_path = self.root_dir / readme_file
            if readme_path.exists():
                with open(readme_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Update version only for regular version
                content = re.sub(pattern, template.format(
                    new_version_str), content)

                with open(readme_path, 'w', encoding='utf-8') as f:
                    f.write(content)

    def _get_version_from_manifests(self, browsers):
        """Get version from manifest files"""
        version_strs = []
        for browser in browsers:
            manifest_path = self.root_dir / \
                f'client/manifests/{browser}/manifest.json'
            with open(manifest_path, encoding='utf-8') as f:
                manifest = json.load(f)
                version_strs.append(manifest['version'])

        assert all(x == version_strs[0] for x in version_strs), \
            'Version numbers are not the same across all browsers and versions.'
        return version_strs[0]

    @staticmethod
    def _ensure_changelog_structure(version_entry):
        """Ensure changelog entry has correct structure"""
        if 'date' not in version_entry:
            version_entry['date'] = datetime.now().strftime('%Y-%m-%d')
        if 'changes' not in version_entry or not isinstance(version_entry['changes'], dict):
            version_entry['changes'] = {'zh': [], 'en': []}
        else:
            if 'zh' not in version_entry['changes']:
                version_entry['changes']['zh'] = []
            if 'en' not in version_entry['changes']:
                version_entry['changes']['en'] = []

    @staticmethod
    def _sort_changelog(changelog):
        """Sort changelog by version number in descending order"""
        return dict(sorted(
            changelog.items(),
            key=lambda x: tuple(map(int, x[0].split('.'))),
            reverse=True
        ))


class Builder:
    """
    This class is used to build the browser extensions and Docker image.
    """

    # Constants
    BROWSERS = ['Chrome', 'Firefox']
    DOCKER_IMAGE_NAME = 'henryxrl/simpletextreader'
    REMOTE_HOST = 'web_server'
    REMOTE_PROJECT_PATH = '/var/www/simple-text-reader'
    REMOTE_HOST_SCRIPT_PATH = '/var/www/script-to-host-websites/host_website.py'
    REMOTE_HOST_SCRIPT_ARGS = 'simple-text-reader 5001'

    def __init__(self, version_str=None):
        self.version_manager = VersionManager()
        self.root_dir = Path(__file__).parent.parent.resolve()

        # Get and validate version
        cur_version = self.version_manager.get_version(self.BROWSERS)
        self.version = version_str if version_str else cur_version
        self.version = self.version_manager.validate_version_str(self.version)

        print(f'Current Version: {cur_version}')
        print(f'New Version: {self.version}')

        # Update version in all files
        self.version_manager.update_version_in_files(self.version)

    def build_extensions(self):
        """Build browser extensions"""
        print('Building extensions...')

        # Prepare dist directory
        dist_dir_name = 'dist'
        dist_dir_root = self.root_dir / dist_dir_name
        if dist_dir_root.exists():
            rmtree(dist_dir_root)

        for browser in self.BROWSERS:
            print(f'Building {browser} extension...')
            # Create dist directory for each browser
            dist_dir = dist_dir_root / browser
            dist_dir.mkdir(parents=True, exist_ok=True)

            # Update manifest.json
            manifest_path = self.root_dir / \
                f'client/manifests/{browser}/manifest.json'
            with open(manifest_path, 'r+', encoding='utf-8') as f:
                data = json.load(f)
                data['version'] = self.version
                f.seek(0)
                json.dump(data, f, indent=4, ensure_ascii=False)
                f.truncate()

            # Copy files
            copy2(manifest_path, dist_dir)
            self._copy_extension_files(dist_dir)

            # Create zip
            self._create_extension_zip(browser, dist_dir_name)

        print('Built extensions successfully!')

    def build_docker(self):
        """Build Docker image"""
        if not self._check_docker():
            print('Docker is not available or not running. Skipping Docker build.')
            return False

        print('Building Docker image...')

        try:
            # Build latest tag
            print('Building Docker image with latest tag...')
            subprocess.run(
                f"docker buildx build --platform linux/amd64,linux/arm64 "
                f"-t {self.DOCKER_IMAGE_NAME}:latest --push .",
                shell=True,
                check=True,
                cwd=self.root_dir
            )

            # Build version tag
            print(f'Building Docker image with version {self.version}...')
            subprocess.run(
                f"docker buildx build --platform linux/amd64,linux/arm64 "
                f"-t {self.DOCKER_IMAGE_NAME}:{self.version} --push .",
                shell=True,
                check=True,
                cwd=self.root_dir
            )

            print('Built Docker image successfully!')
            return True

        except Exception as e:
            print(f'Docker build failed: {str(e)}')
            return False

    def deploy_to_remote_server(self):
        """Deploy to remote server"""
        if not self._check_ssh():
            print(
                'SSH is not available or remote host is not accessible. Skipping deployment.')
            return False

        print('Deploying to remote server...')

        try:
            # Deploy to remote server
            command = (
                f'ssh {self.REMOTE_HOST} "'
                f'cd {self.REMOTE_PROJECT_PATH} && '
                'git pull origin main && '
                f'python3 {self.REMOTE_HOST_SCRIPT_PATH} {self.REMOTE_HOST_SCRIPT_ARGS}'
                '"'
            )

            subprocess.run(command, shell=True, check=True)
            print('Deployment completed successfully!')
            return True

        except Exception as e:
            print(f'Deployment failed: {str(e)}')
            return False

    def _copy_extension_files(self, dist_dir):
        """Copy necessary files for extension build"""
        # Copy directories
        dirs_to_copy = ['client/css', 'client/fonts',
                        'client/images', 'client/app', 'shared']
        for dir_name in dirs_to_copy:
            copytree(self.root_dir / dir_name,
                     dist_dir / dir_name,
                     dirs_exist_ok=True)

        # Remove debug directory
        rmtree(dist_dir / 'client/app/debug', ignore_errors=True)

        # Copy individual files
        files_to_copy = ['index.html', 'version.json']
        for file_name in files_to_copy:
            copy2(self.root_dir / file_name, dist_dir)

        # remove font
        # os.remove(dist_dir / 'fonts' / 'FZSKBXKK.woff2')

        # Remove README files
        for readme in dist_dir.rglob('README.md'):
            readme.unlink()

    def _create_extension_zip(self, browser, dist_dir_name):
        """Create zip file for extension"""
        os.system(
            f'cd {self.root_dir}/{dist_dir_name}/{browser} && '
            f'zip -0 -r -FS ../{browser}.zip ./* '
            f'--exclude "*.git*" --exclude "*.DS_Store" && '
            f'cd ../..'
        )

    def _check_docker(self) -> bool:
        """Check if Docker is available and running"""
        try:
            # Check if docker is available
            result = subprocess.run(
                ['docker', 'info'],
                capture_output=True,
                check=False
            )
            if result.returncode != 0:
                return False

            # Check if docker buildx is available
            result = subprocess.run(
                ['docker', 'buildx', 'version'],
                capture_output=True,
                check=False
            )
            return result.returncode == 0
        except Exception:
            return False

    def _check_ssh(self) -> bool:
        """Check if SSH is available and remote host is accessible"""
        try:
            # Check if ssh and remote host are available
            result = subprocess.run(
                ['ssh', self.REMOTE_HOST, 'echo "SSH connection test"'],
                capture_output=True,
                check=False
            )
            return result.returncode == 0
        except Exception:
            return False


def main():
    parser = argparse.ArgumentParser(
        description='Build tool for SimpleTextReader')
    parser.add_argument('-v', '--version', type=str, default='',
                        help='Version to build')
    parser.add_argument('-d', '--docker', action='store_true',
                        help='Build Docker image')
    parser.add_argument('-e', '--extension', action='store_true',
                        help='Build browser extensions')
    parser.add_argument('-a', '--all', action='store_true',
                        help='Build both Docker image and browser extensions')
    parser.add_argument('-p', '--deploy', action='store_true',
                        help='Deploy to remote server after building')
    args = parser.parse_args()

    # Initialize builder
    builder = Builder(args.version)

    # If no build type is specified, default to --all and --deploy
    if not (args.docker or args.extension or args.all):
        args.all = True
        args.deploy = True

    # Perform requested build
    if args.all:
        builder.build_extensions()
        print('\n' + '-' * 50 + '\n')
        builder.build_docker()
    elif args.extension:
        builder.build_extensions()
    elif args.docker:
        if not builder.build_docker():
            sys.exit(1)

    # Deploy to remote server if requested and build was performed
    if args.deploy:
        print('\n' + '-' * 50 + '\n')
        builder.deploy_to_remote_server()


if __name__ == '__main__':
    main()
