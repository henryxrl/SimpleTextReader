import subprocess
import re
from pathlib import Path


# Define a function to run the git log command and format the output
def generate_changelog(since_commit="v1.4.4"):
    try:
        # Find the date of the since_commit
        print(f"Retrieving date for commit {since_commit}...")
        commit_date_command = [
            "git", "log", "-1", "--pretty=format:%cd", "--date=format:'%Y-%m-%d %H:%M:%S'", since_commit
        ]
        commit_date_result = subprocess.run(
            commit_date_command, stdout=subprocess.PIPE, text=True)

        if commit_date_result.returncode != 0 or not commit_date_result.stdout.strip():
            print(
                f"Error: Failed to retrieve the date for commit {since_commit}.")
            return

        since_date = commit_date_result.stdout.strip().strip("'")
        print(f"Using since date: {since_date}")

        # Run git log command to get formatted commit messages
        git_log_command = [
            "git", "log",
            f"--since={since_date}",
            "--pretty=format:%h %cd %s%n%b",
            "--date=format:'%Y-%m-%d'"
        ]
        print("Running git log command...")
        result = subprocess.run(
            git_log_command, stdout=subprocess.PIPE, text=True)

        if result.returncode != 0:
            print("Error: git log command failed.")
            return

        # Split the result into lines
        log_data = result.stdout.splitlines()
        print(f"Retrieved {len(log_data)} lines from git log.")

        changelog = "# Changelog\n\n"
        current_version = None
        sections = {"Added": [], "Removed": [], "Fixed": [], "Others": []}

        for line in log_data:
            line = line.strip()
            # print(f"Processing line: {line}")

            # Detect version headers
            version_match = re.match(
                r"^\S+ \'(\d{4}-\d{2}-\d{2})\' v(\S+)$", line)
            if version_match:
                if current_version:
                    # Append the current version's changelog
                    changelog += format_version(current_version, sections)

                # Reset for the new version
                date, version = version_match.groups()
                current_version = f"Version {version} ({date})"
                sections = {"Added": [], "Removed": [],
                            "Fixed": [], "Others": []}
                print(f"Detected version: {current_version}")
                continue

            # Categorize commit messages
            if line.startswith("[+]"):
                sections["Added"].append(process_line(line[3:].strip()))
            elif line.startswith("[-]"):
                sections["Removed"].append(process_line(line[3:].strip()))
            elif line.startswith("[*]") or line.startswith("[!]"):
                sections["Fixed"].append(process_line(line[3:].strip()))
            elif line:
                sections["Others"].append(process_line(line))

        # Append the last version
        if current_version:
            changelog += format_version(current_version, sections)

        # Write the changelog to a file
        with open(Path(__file__).parent.parent / "CHANGELOG.md", "w", encoding="utf-8") as f:
            f.write(changelog)
        print(
            f"Changelog has been written to {Path(__file__).parent.parent / 'CHANGELOG.md'}.")

    except Exception as e:
        print(f"An error occurred: {e}")


# Helper function to format a version's changelog
def format_version(version, sections):
    formatted = f"## {version}\n\n"
    for section, items in sections.items():
        if items:
            formatted += f"### {section}\n"
            for item in items:
                formatted += f"- {item}\n"
            formatted += "\n"
    return formatted


# Helper function to process a single line
def process_line(line):
    line = line.strip()
    # print(f"Processing line: {line}")

    # Remove numbering like "1. ", "2. ", etc.
    line = re.sub(r"^\d+\. ", "", line)

    # Capitalize the line if it starts with a letter
    if line and line[0].isalpha():
        line = line[0].upper() + line[1:]

    return line


if __name__ == "__main__":
    # Run the script under the project root directory of the GitHub version
    print("Starting changelog generation...")
    generate_changelog()
    print("Changelog generation complete.")
