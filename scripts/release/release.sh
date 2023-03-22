# In order to release a new version of the application, you need to load this script to bash shell.
#
# source scripts/release/release.sh
#
# Then call 
#
# release-util
#
# Check `release-util` help for more details.

# Colors.
export GREEN='\e[32m'
export RED='\e[31m'
export BLACK='\e[0m'

# Green output.
function echo_green() {
    echo -e ${GREEN}"$*"${BLACK}
}

# Green output.
function echo_red() {
    echo -e ${RED}"$*"${BLACK}
}

# Check if string is a parameter.
function is_arg() {
    [[ $1 == -* ]] && echo_red "$1 should be an argument, but it is a parameter!" && return 1
    return 0
}

# Fetch new remote tags and prune non pushed local tags
function op-fetch-tags() {
    local TAG TAGS NEW_TAGS

    if [ $# -gt 0 ]
    then
        case $1 in
            '-h' | '--help')
                echo "op-mode: fetch new remote tags and prune non pushed local tags ..."
                return
            ;;
            *)
                MODE=$1
            ;;
        esac
    fi

    echo_green "Fetching new remote tags and pruning non pushed local tags ..."

    # Fetch local tags and put them into dictionary.
    declare -A TAGS
    for TAG in $(git tag -l)
    do
        TAGS[$TAG]=1
    done

    # Fetch only new remote tags, remove matching local tags.
    declare -A NEW_TAGS
    for TAG in $(git ls-remote --tags --refs 2>/dev/null | cut -f2 | cut -d"/" -f3)
    do
        if [ ${TAGS[$TAG]} ]
        then
            unset TAGS["$TAG"]
        else
            NEW_TAGS[$TAG]=1
        fi
    done

    # Remove not pushed local tags (they are not present on remote)
    for TAG in ${!TAGS[@]}
    do
        echo_green "Removing not pushed local tag: $TAG ..."
        git tag -d $TAG
    done

    # Pull new remote tags.
    git fetch -t
}

# Versioning
function update-versions() {
    # Local vars
    local RX

    # Get the last version tag.
    local MODED_TAG_VERSION=''
    local TAG_VERSION=
    local TARGETVERSION=$1

    TAG_VERSION=($(git tag -l --sort=-taggerdate "$TARGETVERSION*"))
    TAG_VERSION=${TAG_VERSION[0]}

    # Parse version tag.
    local TAG_ARRAY=( $(tr '.' ' ' <<< "$TAG_VERSION") )
    local MAJOR=${TAG_ARRAY[0]}
    local MINOR=${TAG_ARRAY[1]}
    local REV=${TAG_ARRAY[2]}

    # Update versions.
    if [ $MAJOR_UPDATE ]
    then
        MAJOR=$(( MAJOR + 1 ))
        MINOR=0
        REV=0
    elif [ $MINOR_UPDATE ]
    then
        MINOR=$(( MINOR + 1 ))
        REV=0
    else
        REV=$(( REV + 1 ))
    fi

    VERSION_GIT_TAG=$MAJOR.$MINOR.$REV
    echo_green "    " VERSION_GIT_TAG: $VERSION_GIT_TAG

    git checkout main
    RX='s/^Current production tag is \([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)\.$/Current production tag is '${VERSION_GIT_TAG}'./g'
    [ -z $DRY_RUN ] &&  sed -i '' "$RX" README.md

    RX='s/^git checkout \([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$/git checkout '${VERSION_GIT_TAG}'/g'
    [ -z $DRY_RUN ] &&  sed -i '' "$RX" README.md

}

# Show versions
function show-versions() {
    # Local vars
    local RX

    # Get the last version tag.
    local TAG_VERSION="$(git tag --sort=-taggerdate | head -1)"

    # Parse version tag.
    local TAG_ARRAY=( $(tr '.' ' ' <<< "$TAG_VERSION") )
    local MAJOR=${TAG_ARRAY[0]}
    local MINOR=${TAG_ARRAY[1]}
    local REV=${TAG_ARRAY[2]}

    echo_green "    " VERSION_GIT_TAG: $VERSION_GIT_TAG
}


# Update versions.
function release-util() {
    local OLD=$PWD
    local OLD_MODE=$__MODE__

    MODE="None" # GLOBAL
    TAG="" # GLOBAL
    local MINOR_UPDATE=
    local MAJOR_UPDATE=
    local DRY_RUN=
    local RESET=1
    local KEEP=
    BUILD=all
    local TARGETVERSION=
    local IGNOREBRANCH=
    local ARGS=()

    [ -n "$(git status -s)" ] && echo_red "Uncommited changes exist. Aborting." && return

    while [ $# -gt 0 ]
    do
        ARG=$1
        shift

        case $ARG in
            '-h' | '--help')
                echo "release-util -m <mode> [OPTION]: release application."
                echo "      -d --dry-run Don't update or push anything."
                echo "      -u --minor-update Increate minor version number and update build configuration files."
                echo "      -i --ignore-branch Ignores the 'main' branch check."
                echo "      -j --major-update Increate major version number and update build configuration files."
                echo "      -l --list-tags List available tags."
                echo "      -r --remove-tag <tag> Remove a specified tag."
                echo "      -t --tag <tag> Only newer commit logs than this tag will be shown in the app."
                echo "      -K --keep-versions It does not change versions for the build (no rocket chat)."
                echo "      -v --version Displays current deployment version."
                echo "      -V --target-version Force target version to release."
                return
            ;;
            '-d' | '--dry-run')
                DRY_RUN=true
            ;;
            '-u' | '--minor-update')
                MINOR_UPDATE=true
            ;;
            '-j' | '--major-update')
                MAJOR_UPDATE=true
            ;;
            '-l' | '--list-tags')
                git for-each-ref --sort=taggerdate --format '%(refname) %(taggerdate)' refs/tags
                return
            ;;
            '-r' | '--remove-tag')
                is_arg $1 || return 1
                if [ -n "$1" ]
                then
                    local R_TAG=$1
                    echo_green "release-util: removing tag [$R_TAG] ..."

                    git tag -d $R_TAG
                    git push origin :refs/tags/$R_TAG
                    git push github :refs/tags/$R_TAG
                fi
                return
            ;;
            '-t' | '--tag')
                is_arg $1 || return 1
                [ -n $1 ] && TAG=$1
                shift
            ;;
            '-K' | '--keep-version')
                KEEP=true
            ;;
            '-v' | '--version')
                show-versions
                return
            ;;
            '-V' | '--target-version')
                is_arg $1 || return 1
                [ -n $1 ] && TARGETVERSION=$1
            ;;
            '-I' | '--ignore-branch')
                IGNOREBRANCH=true
            ;;
            *)
                ARGS+=($ARG)
            ;;
        esac
    done

    local GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    local TARGET="main"
    if [ "$GIT_BRANCH" != "$TARGET" ] && [ -z $IGNOREBRANCH ]
    then
        echo_red "You are trying to use release-util on branch '$GIT_BRANCH' to should be '$TARGET'!"
        return
    fi

    echo_green "release-util: normalize local git tags ..."
    op-fetch-tags

    echo_green "release-util: updating versions ..."
    [ ! $KEEP ] && update-versions $TARGETVERSION


    echo_green "commits: commiting version changes to repository ..."
    [ -z $DRY_RUN ] && git add README.md
    [ -z $DRY_RUN ] && git add deployment/README.md

    [ -z $DRY_RUN ] && git commit -m "New release $VERSION_GIT_TAG."

    echo_green "commits [$MODE]: commiting new tag $VERSION_GIT_TAG to repository ..."
    [ -z $DRY_RUN ] && git push origin $TARGET
    [ -z $DRY_RUN ] && git push github $TARGET
    [ -z $DRY_RUN ] && git tag -a $VERSION_GIT_TAG -m "release $VERSION_GIT_TAG"
    [ -z $DRY_RUN ] && git push origin --tags
    [ -z $DRY_RUN ] && git push github --tags

}
