#!/bin/sh

## Init script for the Alexa build repo.
## (must be run from the skill root folder)

BUILD_FOLDER="build"
CODE_FOLDER="code"
SRC_FOLDER="$CODE_FOLDER/src"

# If the skill build is not present, clone it
if [ ! -d "$BUILD_FOLDER" ]
then
	echo "Alexa build repo not present. Initializing..."

	skillId=$(tr -d '\n' < "./$SRC_FOLDER/index.ts"| tr -d ' ' | sed -n 's/.*withSkillId\(.*\)/\1/p' | cut -f1 -d ")" | tr -d "()\"'")
	if [ -n "$skillId" ]
	then
		# Workaround for ask-cli issue: using a temp folder
		# (ask init fails if current folder has a git repo)
		starting_dir="$(pwd)"
		tmp_dir="$BUILD_FOLDER-tmp"
		mkdir "$tmp_dir"
		cd "$tmp_dir"

		# Run the ask init command and store the status code
		echo "$BUILD_FOLDER" | ask init --hosted-skill-id "$skillId"
		ask_init_status_code=$?
		
		cd "$starting_dir"

		if [ $ask_init_status_code -eq 0 ]
		then
			# Move the build repo back to the original folder
			mv "$tmp_dir/$BUILD_FOLDER" .
			# Remove the temp folder
			rm -rf "$tmp_dir"				
		else
			# If the ask init command failed, exit with an error
			exit 1
		fi
	else
		echo "Error: The $BUILD_FOLDER folder does not exist, and the skill id could not be obtained."
		echo "Please, look up the skill id for this skill and run the following command in the root folder:"
		echo "\"echo \"$BUILD_FOLDER\" | ask init --hosted-skill-id <skill-id>\""
		exit 1
	fi
else
	echo "Alexa build repo is already present. Nothing to do."
fi

echo "Alexa build repo init was successful."
exit 0
