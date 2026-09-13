#!/usr/bin/env bash
############################################################################
# Copyright (C) 2026 AirlinkLabs
# MIT License — see LICENSE file for details.
############################################################################
# Airlink Installer — interactive + non-interactive installation of the
# Airlink panel and/or daemon on Linux, macOS, and Windows (WSL).
############################################################################

# Arithmetic operations like (( x++ )) return 1 on zero; don't use set -e.
set -uo pipefail

readonly VERSION="3.2.0"
readonly LOG="/tmp/airlink-installer.log"
readonly PANEL_REPO="https://github.com/airlinklabs/panel.git"
readonly DAEMON_RELEASE_API="https://api.github.com/repos/airlinklabs/daemon/releases/latest"

PNPM_REGISTRY="https://registry.npmjs.org"
PNPM="pnpm"
PNPM_STORE="/root/.pnpm-store"

declare -a ADDONS=(
    "Modrinth|https://github.com/airlinklabs/addons.git|modrinth|modrinth"
    "Parachute|https://github.com/airlinklabs/addons.git|parachute|parachute"
)

###############################################################################
# ANSI — black-and-white palette only
###############################################################################

ESC=$'\033'
RESET="${ESC}[0m"
BOLD="${ESC}[1m"
DIM="${ESC}[2m"
REV="${ESC}[7m"   # reverse-video — used for selection highlight
HIDE_CURSOR="${ESC}[?25l"
SHOW_CURSOR="${ESC}[?25h"
CLEAR_SCREEN="${ESC}[2J${ESC}[H"

_at()    { printf "${ESC}[%d;%dH" "$1" "$2"; }
_clr()   { printf "${ESC}[2K"; }
_up()    { printf "${ESC}[%dA" "$1"; }
_col()   { printf "${ESC}[%dG" "$1"; }

###############################################################################
# Logging
###############################################################################

log()  { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }
_ok()  { log "OK: $*"; }
_err() { log "ERROR: $*"; }
_wrn() { log "WARN: $*"; }

die() {
    printf "%b" "${SHOW_CURSOR}" 2>/dev/null || true
    tput rmcup 2>/dev/null || printf "%b" "${CLEAR_SCREEN}" 2>/dev/null || true
    stty echo 2>/dev/null || true
    printf "\n${BOLD}  error:${RESET} %s\n\n" "$*" >&2
    _err "$*"
    exit 1
}

###############################################################################
# Argument parsing
###############################################################################

ARG_MODE=""
ARG_NAME=""
ARG_PORT=""
ARG_PANEL_ADDR=""
ARG_DAEMON_PORT=""
ARG_DAEMON_KEY=""
ARG_ADDONS=""
ARG_URL=""
ARG_TRUST_PROXY=""
ARG_COOKIE_DOMAIN=""
ARG_CSP_ENABLED=""
ARG_RATE_LIMIT=""
ARG_LOG_LEVEL=""
ARG_SMTP_HOST=""

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --panel-only)     ARG_MODE="panel";              shift ;;
            --daemon-only)    ARG_MODE="daemon";             shift ;;
            --name)           ARG_NAME="${2:-}";             shift 2 ;;
            --port)           ARG_PORT="${2:-}";             shift 2 ;;
            --panel-addr)     ARG_PANEL_ADDR="${2:-}";       shift 2 ;;
            --daemon-port)    ARG_DAEMON_PORT="${2:-}";      shift 2 ;;
            --daemon-key)     ARG_DAEMON_KEY="${2:-}";       shift 2 ;;
            --addons)         ARG_ADDONS="${2:-}";           shift 2 ;;
            --url)            ARG_URL="${2:-}";              shift 2 ;;
            --trust-proxy)    ARG_TRUST_PROXY="true";        shift ;;
            --cookie-domain)  ARG_COOKIE_DOMAIN="${2:-}";   shift 2 ;;
            --csp-enabled)    ARG_CSP_ENABLED="true";        shift ;;
            --rate-limit)     ARG_RATE_LIMIT="${2:-}";       shift 2 ;;
            --log-level)      ARG_LOG_LEVEL="${2:-}";        shift 2 ;;
            --smtp-host)      ARG_SMTP_HOST="${2:-}";        shift 2 ;;
            *) log "Unknown arg ignored: $1"; shift ;;
        esac
    done
}

noninteractive() {
    [[ -n "${ARG_MODE}${ARG_NAME}${ARG_PORT}${ARG_PANEL_ADDR}${ARG_DAEMON_PORT}${ARG_DAEMON_KEY}${ARG_ADDONS}" ]]
}

###############################################################################
# Terminal measurement
###############################################################################

TERM_ROWS=24
TERM_COLS=80
_TUI_ACTIVE=0

_measure() {
    TERM_ROWS=$(tput lines 2>/dev/null || echo 24)
    TERM_COLS=$(tput cols  2>/dev/null || echo 80)
    [[ $TERM_ROWS -lt 18 ]] && TERM_ROWS=18
    [[ $TERM_COLS -lt 60 ]] && TERM_COLS=60
}

###############################################################################
# TUI lifecycle
###############################################################################

_tui_cleanup() {
    if [[ $_TUI_ACTIVE -eq 1 ]]; then
        _TUI_ACTIVE=0
        printf "%b" "${SHOW_CURSOR}"
        tput rmcup 2>/dev/null || printf "%b" "${CLEAR_SCREEN}"
        stty echo 2>/dev/null || true
    fi
}

_tui_init() {
    _measure
    tput smcup 2>/dev/null || printf "%b" "${CLEAR_SCREEN}"
    printf "%b" "${HIDE_CURSOR}"
    stty -echo 2>/dev/null || true
    _TUI_ACTIVE=1
    trap '_tui_cleanup; exit 0' EXIT INT TERM
}

###############################################################################
# Box drawing — ASCII +---+ style
###############################################################################

# _box ROW COL WIDTH HEIGHT [TITLE]
# Draws a titled box at the given absolute position.
_box() {
    local row=$1 col=$2 w=$3 h=$4 title="${5:-}"
    local inner=$(( w - 2 ))

    _at "$row" "$col"
    if [[ -n "$title" ]]; then
        local tlen=${#title}
        local avail=$(( inner - 4 ))
        [[ $tlen -gt $avail ]] && title="${title:0:$avail}" && tlen=$avail
        local dashes=$(( inner - tlen - 2 ))
        local left=$(( dashes / 2 ))
        local right=$(( dashes - left ))
        printf "+"
        [[ $left  -gt 0 ]] && printf '%*s' "$left"  '' | tr ' ' '-'
        printf "${BOLD} %s ${RESET}" "$title"
        [[ $right -gt 0 ]] && printf '%*s' "$right" '' | tr ' ' '-'
        printf "+"
    else
        printf "+"; printf '%*s' "$inner" '' | tr ' ' '-'; printf "+"
    fi

    local r
    for (( r = 1; r < h - 1; r++ )); do
        _at $(( row + r )) "$col"
        printf "|%*s|" "$inner" ''
    done

    _at $(( row + h - 1 )) "$col"
    printf "+"; printf '%*s' "$inner" '' | tr ' ' '-'; printf "+"
}

# _hline ROW COL WIDTH — draw a horizontal divider (mid-box separator)
_hline() {
    local row=$1 col=$2 w=$3
    _at "$row" "$col"
    printf "+"; printf '%*s' $(( w - 2 )) '' | tr ' ' '-'; printf "+"
}

###############################################################################
# Keyboard input
###############################################################################

_KEY=""

_read_key() {
    local k1 k2 k3
    IFS= read -rsn1 k1
    if [[ "$k1" == $'\x1b' ]]; then
        IFS= read -rsn1 -t 0.05 k2 2>/dev/null || k2=""
        if [[ "$k2" == "[" ]]; then
            IFS= read -rsn1 -t 0.05 k3 2>/dev/null || k3=""
            case "$k3" in
                A) _KEY="UP"    ;;
                B) _KEY="DOWN"  ;;
                C) _KEY="RIGHT" ;;
                D) _KEY="LEFT"  ;;
                *) _KEY="ESC"   ;;
            esac
        else
            _KEY="ESC"
        fi
    elif [[ "$k1" == "" || "$k1" == $'\n' || "$k1" == $'\r' ]]; then
        _KEY="ENTER"
    elif [[ "$k1" == $'\x7f' || "$k1" == $'\b' ]]; then
        _KEY="BACKSPACE"
    elif [[ "$k1" == " " ]]; then
        _KEY="SPACE"
    else
        _KEY="$k1"
    fi
}

###############################################################################
# Banner
###############################################################################

_BANNER=(
    "    _    ___ ____  _     ___ _   _ _  __"
    "   / \\  |_ _|  _ \\| |   |_ _| \\ | | |/ /"
    "  / _ \\  | || |_) | |    | ||  \\| | ' / "
    " / ___ \\ | ||  _ <| |___ | || |\\  | . \\ "
    "/_/   \\_\\___|_| \\_\\_____|___|_| \\_|_|\\_\\"
    ""
    "  Airlink Installer  v${VERSION}"
)

_draw_banner() {
    local start_row=$1
    local bx=$(( (TERM_COLS - ${#_BANNER[0]}) / 2 ))
    [[ $bx -lt 1 ]] && bx=1
    local i
    for (( i = 0; i < ${#_BANNER[@]}; i++ )); do
        _at $(( start_row + i )) "$bx"
        if [[ $i -ge 5 ]]; then
            printf "${DIM}%s${RESET}" "${_BANNER[$i]}"
        else
            printf "%s" "${_BANNER[$i]}"
        fi
    done
}

###############################################################################
# Menu  (arrow-key, numbered hotkeys)
###############################################################################

TUI_RESULT=0
_INSTALLING=0

tui_menu() {
    local title="$1"; shift
    local -a items=("$@")
    local count=${#items[@]}
    local selected=0

    _measure

    local max_item=0
    local i
    for (( i = 0; i < count; i++ )); do
        [[ ${#items[$i]} -gt $max_item ]] && max_item=${#items[$i]}
    done

    local box_w=$(( TERM_COLS * 60 / 100 ))
    [[ $box_w -lt $(( max_item + 10 )) ]] && box_w=$(( max_item + 10 ))
    [[ $box_w -lt 56 ]]                   && box_w=56
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))

    local banner_h=7
    local box_h=$(( count + 5 ))
    local total_h=$(( banner_h + 1 + box_h ))
    local box_r=$(( (TERM_ROWS - total_h) / 2 + banner_h + 1 ))
    [[ $box_r -lt $(( banner_h + 2 )) ]] && box_r=$(( banner_h + 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_c -lt 1 ]] && box_c=1

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _draw_banner $(( box_r - banner_h - 1 ))
        _box "$box_r" "$box_c" "$box_w" "$box_h" "$title"

        _at $(( box_r + 1 )) $(( box_c + 2 ))
        printf "${DIM}%-${inner}s${RESET}" "  ↑/↓  move    Enter  select    0-9  hotkey    q  quit"
        _hline $(( box_r + 2 )) "$box_c" "$box_w"

        for (( i = 0; i < count; i++ )); do
            _at $(( box_r + 3 + i )) $(( box_c + 1 ))
            local label="  [${i}]  ${items[$i]}"
            if [[ $i -eq $selected ]]; then
                printf "${REV}%-${inner}s${RESET}" "$label"
            else
                printf "%-${inner}s" "$label"
            fi
        done

        _at $(( box_r + box_h - 2 )) $(( box_c + 2 ))
        printf "${DIM}v${VERSION}${RESET}"

        _read_key
        case "$_KEY" in
            UP|k)   [[ $selected -gt 0 ]]              && selected=$(( selected - 1 )) ;;
            DOWN|j) [[ $selected -lt $(( count-1 )) ]] && selected=$(( selected + 1 )) ;;
            ENTER)  TUI_RESULT=$selected; return 0 ;;
            ESC|q|Q)
                if [[ $_INSTALLING -eq 0 ]]; then
                    TUI_RESULT=-1; return 1
                fi
                ;;
            [0-9])
                if [[ "${_KEY}" -lt $count ]]; then
                    TUI_RESULT="${_KEY}"; return 0
                fi
                ;;
        esac
    done
}

###############################################################################
# Multi-select checklist
###############################################################################

TUI_MULTI=""

tui_checklist() {
    local title="$1"; shift
    local -a items=("$@")
    local count=${#items[@]}
    local cursor=0
    declare -a checked
    for (( i = 0; i < count; i++ )); do checked[$i]=0; done

    _measure

    local max_item=0
    local i
    for (( i = 0; i < count; i++ )); do
        [[ ${#items[$i]} -gt $max_item ]] && max_item=${#items[$i]}
    done
    local box_w=$(( max_item + 14 ))
    [[ $box_w -lt 50 ]]                   && box_w=50
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))

    local box_h=$(( count + 5 ))
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    [[ $box_c -lt 1 ]] && box_c=1

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _box "$box_r" "$box_c" "$box_w" "$box_h" "$title"

        _at $(( box_r + 1 )) $(( box_c + 2 ))
        printf "${DIM}%-${inner}s${RESET}" "  Space/num toggle   Enter confirm   q skip"
        _hline $(( box_r + 2 )) "$box_c" "$box_w"

        for (( i = 0; i < count; i++ )); do
            _at $(( box_r + 3 + i )) $(( box_c + 1 ))
            local mark="[ ]"
            [[ ${checked[$i]} -eq 1 ]] && mark="[x]"
            local label="  [$(( i + 1 ))]  ${mark}  ${items[$i]}"
            if [[ $i -eq $cursor ]]; then
                printf "${REV}%-${inner}s${RESET}" "$label"
            else
                printf "%-${inner}s" "$label"
            fi
        done

        _read_key
        case "$_KEY" in
            UP|k)   [[ $cursor -gt 0 ]]              && cursor=$(( cursor - 1 )) ;;
            DOWN|j) [[ $cursor -lt $(( count-1 )) ]] && cursor=$(( cursor + 1 )) ;;
            SPACE)
                if [[ ${checked[$cursor]} -eq 1 ]]; then checked[$cursor]=0; else checked[$cursor]=1; fi
                ;;
            [1-9])
                local np=$(( _KEY - 1 ))
                if [[ $np -lt $count ]]; then
                    if [[ ${checked[$np]} -eq 1 ]]; then checked[$np]=0; else checked[$np]=1; fi
                    cursor=$np
                fi
                ;;
            ENTER)
                TUI_MULTI=""
                for (( i = 0; i < count; i++ )); do
                    [[ ${checked[$i]} -eq 1 ]] && TUI_MULTI="${TUI_MULTI} $i"
                done
                TUI_MULTI="${TUI_MULTI# }"
                return 0
                ;;
            ESC|q|Q)
                [[ $_INSTALLING -eq 0 ]] && TUI_MULTI="" && return 1
                ;;
        esac
    done
}

###############################################################################
# Text input — box-framed, with optional error line
###############################################################################

TUI_INPUT=""

tui_input() {
    local prompt_text="$1"
    local default="${2:-}"
    local error_msg="${3:-}"
    local value="$default"

    _measure

    local box_w=$(( TERM_COLS / 2 + 10 ))
    [[ $box_w -lt 50 ]]                   && box_w=50
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))
    local field_w=$(( box_w - 6 ))

    local extra_lines=0
    [[ -n "$error_msg" ]] && extra_lines=1
    local box_h=$(( 8 + extra_lines ))
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    [[ $box_c -lt 1 ]] && box_c=1
    local field_row=$(( box_r + 4 + extra_lines ))

    stty echo 2>/dev/null || true

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _box "$box_r" "$box_c" "$box_w" "$box_h" "Input"

        _at $(( box_r + 1 )) $(( box_c + 2 ))
        printf "  ${BOLD}%-$(( inner - 2 ))s${RESET}" "$prompt_text"

        if [[ -n "$error_msg" ]]; then
            _at $(( box_r + 2 )) $(( box_c + 2 ))
            printf "  ${BOLD}! %-$(( inner - 4 ))s${RESET}" "$error_msg"
        fi

        # Input field sub-box
        _at "$field_row" $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"

        _at $(( field_row + 1 )) $(( box_c + 2 ))
        local display="${value}"
        [[ ${#display} -gt $(( field_w - 2 )) ]] && display="${display: -$(( field_w - 2 ))}"
        printf "| %-$(( field_w - 2 ))s |" "$display"

        _at $(( field_row + 2 )) $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"

        _at $(( box_r + box_h - 2 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "Esc = restore default   Enter = confirm"

        # Position cursor inside the field
        local cursor_x=$(( box_c + 4 + ${#value} ))
        [[ $cursor_x -gt $(( box_c + 2 + field_w - 1 )) ]] && cursor_x=$(( box_c + 2 + field_w - 1 ))
        _at $(( field_row + 1 )) "$cursor_x"
        printf "%b" "${SHOW_CURSOR}"

        _read_key
        printf "%b" "${HIDE_CURSOR}"

        case "$_KEY" in
            ENTER)     TUI_INPUT="$value"; stty -echo 2>/dev/null || true; return 0 ;;
            BACKSPACE) [[ ${#value} -gt 0 ]] && value="${value%?}" ;;
            ESC)       value="$default" ;;
            UP|DOWN|LEFT|RIGHT) : ;;
            *)
                if [[ ${#_KEY} -eq 1 && "$_KEY" =~ [[:print:]] ]]; then
                    value="${value}${_KEY}"
                fi
                ;;
        esac
    done
}

###############################################################################
# Password input — masked, box-framed
###############################################################################

tui_password() {
    local prompt_text="$1"
    local error_msg="${2:-}"
    local value=""

    _measure

    local box_w=$(( TERM_COLS / 2 + 10 ))
    [[ $box_w -lt 50 ]]                   && box_w=50
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))
    local field_w=$(( box_w - 6 ))

    local extra_lines=0
    [[ -n "$error_msg" ]] && extra_lines=1
    local box_h=$(( 8 + extra_lines ))
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    [[ $box_c -lt 1 ]] && box_c=1
    local field_row=$(( box_r + 4 + extra_lines ))

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _box "$box_r" "$box_c" "$box_w" "$box_h" "Password"

        _at $(( box_r + 1 )) $(( box_c + 2 ))
        printf "  ${BOLD}%-$(( inner - 2 ))s${RESET}" "$prompt_text"

        if [[ -n "$error_msg" ]]; then
            _at $(( box_r + 2 )) $(( box_c + 2 ))
            printf "  ${BOLD}! %-$(( inner - 4 ))s${RESET}" "$error_msg"
        fi

        local masked
        masked=$(printf '%*s' "${#value}" '' | tr ' ' '*')

        _at "$field_row" $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"
        _at $(( field_row + 1 )) $(( box_c + 2 ))
        printf "| %-$(( field_w - 2 ))s |" "$masked"
        _at $(( field_row + 2 )) $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"

        _at $(( box_r + box_h - 2 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "Esc = clear   Enter = confirm"

        _read_key
        case "$_KEY" in
            ENTER)     TUI_INPUT="$value"; return 0 ;;
            BACKSPACE) [[ ${#value} -gt 0 ]] && value="${value%?}" ;;
            ESC)       value="" ;;
            UP|DOWN|LEFT|RIGHT) : ;;
            *)
                if [[ ${#_KEY} -eq 1 && "$_KEY" =~ [[:print:]] ]]; then
                    value="${value}${_KEY}"
                fi
                ;;
        esac
    done
}

###############################################################################
# Sudo/admin password prompt — with contextual explanation box
###############################################################################

tui_sudo_prompt() {
    local reason="${1:-Administrative access required}"
    local error_msg="${2:-}"

    _measure

    local box_w=$(( TERM_COLS / 2 + 10 ))
    [[ $box_w -lt 54 ]]                   && box_w=54
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))
    local field_w=$(( box_w - 6 ))

    local extra_lines=0
    [[ -n "$error_msg" ]] && extra_lines=1
    # explanation (3 lines) + gap + field (3 lines) + hint = 11 base
    local box_h=$(( 12 + extra_lines ))
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    [[ $box_c -lt 1 ]] && box_c=1
    local field_row=$(( box_r + 6 + extra_lines ))

    local value=""

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _box "$box_r" "$box_c" "$box_w" "$box_h" "Admin Access Required"

        _at $(( box_r + 1 )) $(( box_c + 2 ))
        printf "  %-$(( inner - 2 ))s" "$reason"

        _at $(( box_r + 2 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "Your password is not stored. It is used only"

        _at $(( box_r + 3 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "for this operation via sudo."

        _hline $(( box_r + 4 )) "$box_c" "$box_w"

        if [[ -n "$error_msg" ]]; then
            _at $(( box_r + 5 )) $(( box_c + 2 ))
            printf "  ${BOLD}! %-$(( inner - 4 ))s${RESET}" "$error_msg"
        fi

        _at $(( box_r + 5 + extra_lines )) $(( box_c + 2 ))
        printf "  ${BOLD}%-$(( inner - 2 ))s${RESET}" "Sudo password"

        local masked
        masked=$(printf '%*s' "${#value}" '' | tr ' ' '*')

        _at "$field_row" $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"
        _at $(( field_row + 1 )) $(( box_c + 2 ))
        printf "| %-$(( field_w - 2 ))s |" "$masked"
        _at $(( field_row + 2 )) $(( box_c + 2 ))
        printf "+%s+" "$(printf '%*s' "$field_w" '' | tr ' ' '-')"

        _at $(( box_r + box_h - 2 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "Esc = clear   Enter = confirm"

        _read_key
        case "$_KEY" in
            ENTER)     TUI_INPUT="$value"; return 0 ;;
            BACKSPACE) [[ ${#value} -gt 0 ]] && value="${value%?}" ;;
            ESC)       value="" ;;
            UP|DOWN|LEFT|RIGHT) : ;;
            *)
                if [[ ${#_KEY} -eq 1 && "$_KEY" =~ [[:print:]] ]]; then
                    value="${value}${_KEY}"
                fi
                ;;
        esac
    done
}

###############################################################################
# Yes/No confirm dialog
###############################################################################

tui_confirm() {
    local prompt_text="$1"
    local selected=0   # 0=yes 1=no

    _measure

    local box_w=56
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local inner=$(( box_w - 2 ))
    local box_h=8
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    [[ $box_c -lt 1 ]] && box_c=1

    while true; do
        printf "%b" "${CLEAR_SCREEN}"
        _box "$box_r" "$box_c" "$box_w" "$box_h" "Confirm"

        _at $(( box_r + 2 )) $(( box_c + 2 ))
        printf "  %-$(( inner - 2 ))s" "$prompt_text"

        _at $(( box_r + 4 )) $(( box_c + 8 ))
        if [[ $selected -eq 0 ]]; then
            printf "${REV}  Yes  ${RESET}        No  "
        else
            printf "  Yes        ${REV}  No  ${RESET}"
        fi

        _at $(( box_r + 6 )) $(( box_c + 2 ))
        printf "  ${DIM}%-$(( inner - 2 ))s${RESET}" "←/→ choose   y/n shortcut   Enter confirm"

        _read_key
        case "$_KEY" in
            LEFT|h|H)  selected=0 ;;
            RIGHT|l|L) selected=1 ;;
            y|Y)       return 0 ;;
            n|N)       return 1 ;;
            ENTER)     return $selected ;;
            ESC|q|Q)   return 1 ;;
        esac
    done
}

###############################################################################
# Inline spinner for quick tasks (TUI mode)
###############################################################################

_SPIN=('-' '\' '|' '/')

tui_run() {
    local label="$1"; shift

    _measure
    local box_w=64
    [[ $box_w -gt $(( TERM_COLS - 4 )) ]] && box_w=$(( TERM_COLS - 4 ))
    local row=$(( TERM_ROWS - 4 ))
    local col=$(( (TERM_COLS - box_w) / 2 ))
    [[ $col -lt 1 ]] && col=1

    _at "$row"          "$col"; printf "+%s+" "$(printf '%*s' $(( box_w - 2 )) '' | tr ' ' '-')"
    _at $(( row + 1 ))  "$col"; printf "| %-$(( box_w - 4 ))s  |" "$label"
    _at $(( row + 2 ))  "$col"; printf "+%s+" "$(printf '%*s' $(( box_w - 2 )) '' | tr ' ' '-')"

    "$@" &>/dev/null &
    local pid=$! fi=0
    local spin_col=$(( col + box_w - 3 ))

    while kill -0 "$pid" 2>/dev/null; do
        _at $(( row + 1 )) "$spin_col"
        printf "%s" "${_SPIN[$fi]}"
        fi=$(( (fi + 1) % 4 ))
        sleep 0.1
    done

    wait "$pid"
    local status=$?
    _at $(( row + 1 )) "$spin_col"
    if [[ $status -eq 0 ]]; then
        printf "${BOLD}*${RESET}"; _ok "$label"
    else
        printf "${BOLD}!${RESET}"; _err "$label failed"
        sleep 0.8; _tui_cleanup; die "$label failed"
    fi
    sleep 0.4
    _at "$row"         "$col"; printf "%${box_w}s" ""
    _at $(( row + 1 )) "$col"; printf "%${box_w}s" ""
    _at $(( row + 2 )) "$col"; printf "%${box_w}s" ""
}

###############################################################################
# Full-screen progress view
###############################################################################

PROGRESS_TASKS=()
PROGRESS_CURRENT=0
_PBOX_R=0; _PBOX_C=0; _PBOX_W=0; _PBOX_H=0

tui_progress_init() { PROGRESS_TASKS=("$@"); PROGRESS_CURRENT=0; }

_progress_draw() {
    local total=${#PROGRESS_TASKS[@]}
    printf "%b" "${CLEAR_SCREEN}"
    _measure

    local box_w=$(( TERM_COLS - 8 ))
    [[ $box_w -lt 54 ]] && box_w=54
    [[ $box_w -gt 90 ]] && box_w=90
    local inner=$(( box_w - 2 ))
    local bar_w=$(( box_w - 10 ))

    local box_h=$(( total + 9 ))
    local box_r=$(( (TERM_ROWS - box_h) / 2 ))
    [[ $box_r -lt 1 ]] && box_r=1
    local box_c=$(( (TERM_COLS - box_w) / 2 ))
    [[ $box_c -lt 1 ]] && box_c=1

    _box "$box_r" "$box_c" "$box_w" "$box_h" "Installing"

    _at $(( box_r + 1 )) $(( box_c + 3 ))
    printf "${DIM}Airlink v${VERSION}${RESET}"
    _hline $(( box_r + 2 )) "$box_c" "$box_w"

    local i
    for (( i = 0; i < total; i++ )); do
        _at $(( box_r + 3 + i )) $(( box_c + 3 ))
        if   [[ $i -lt  $PROGRESS_CURRENT ]]; then
            printf "${BOLD}[+]${RESET} ${DIM}%-$(( inner - 6 ))s${RESET}" "${PROGRESS_TASKS[$i]}"
        elif [[ $i -eq $PROGRESS_CURRENT ]]; then
            printf "${REV}[>]${RESET} ${BOLD}%-$(( inner - 6 ))s${RESET}" "${PROGRESS_TASKS[$i]}"
        else
            printf "${DIM}[ ] %-$(( inner - 6 ))s${RESET}" "${PROGRESS_TASKS[$i]}"
        fi
    done

    _hline $(( box_r + box_h - 4 )) "$box_c" "$box_w"

    local pct=0
    [[ $total -gt 0 ]] && pct=$(( PROGRESS_CURRENT * 100 / total ))
    local filled=$(( pct * bar_w / 100 ))
    local empty=$(( bar_w - filled ))

    _at $(( box_r + box_h - 3 )) $(( box_c + 3 ))
    printf "[%s%s] %3d%%" \
        "$(printf '%*s' "$filled" '' | tr ' ' '#')" \
        "$(printf '%*s' "$empty"  '' | tr ' ' ' ')" \
        "$pct"

    _PBOX_R=$box_r; _PBOX_C=$box_c; _PBOX_W=$box_w; _PBOX_H=$box_h
}

tui_progress_step() {
    _progress_draw

    local spinner_row=$(( _PBOX_R + 3 + PROGRESS_CURRENT ))
    local spinner_col=$(( _PBOX_C + _PBOX_W - 4 ))
    local out_row=$(( _PBOX_R + _PBOX_H + 1 ))
    local out_lines=5
    local out_w=$(( _PBOX_W - 4 ))
    [[ $out_w -lt 20 ]] && out_w=20

    local outfile; outfile=$(mktemp /tmp/al-step-XXXXXX)

    "$@" >"$outfile" 2>&1 &
    local pid=$! fi=0

    while kill -0 "$pid" 2>/dev/null; do
        _at "$spinner_row" "$spinner_col"
        printf "${BOLD}%s${RESET}" "${_SPIN[$fi]}"
        fi=$(( (fi + 1) % 4 ))

        local li=0
        while IFS= read -r line; do
            [[ $(( out_row + li )) -lt $TERM_ROWS ]] || break
            _at $(( out_row + li )) $(( _PBOX_C + 2 ))
            printf "${DIM}%-${out_w}.${out_w}s${RESET}" "$line"
            li=$(( li + 1 ))
        done < <(tail -n${out_lines} "$outfile" 2>/dev/null)
        while [[ $li -lt $out_lines ]]; do
            [[ $(( out_row + li )) -lt $TERM_ROWS ]] || break
            _at $(( out_row + li )) $(( _PBOX_C + 2 ))
            printf "%-${out_w}s" ""
            li=$(( li + 1 ))
        done
        sleep 0.1
    done

    wait "$pid"
    local status=$?

    # Clear trailing output lines
    local li
    for (( li = 0; li < out_lines; li++ )); do
        [[ $(( out_row + li )) -lt $TERM_ROWS ]] || break
        _at $(( out_row + li )) $(( _PBOX_C + 2 ))
        printf "%-${out_w}s" ""
    done

    _at "$spinner_row" "$spinner_col"
    if [[ $status -eq 0 ]]; then
        printf "   "
        _ok "${PROGRESS_TASKS[$PROGRESS_CURRENT]}"
        PROGRESS_CURRENT=$(( PROGRESS_CURRENT + 1 ))
    else
        local err_out; err_out=$(tail -n20 "$outfile" 2>/dev/null || true)
        rm -f "$outfile"
        _err "${PROGRESS_TASKS[$PROGRESS_CURRENT]}"
        _tui_cleanup
        printf "\n${BOLD}  Step failed:${RESET} %s\n\n%s\n\n" \
            "${PROGRESS_TASKS[$PROGRESS_CURRENT]}" "$err_out"
        exit 1
    fi

    rm -f "$outfile"
    sleep 0.05
}

tui_progress_finish() {
    PROGRESS_CURRENT=${#PROGRESS_TASKS[@]}
    _progress_draw
    sleep 1
}

###############################################################################
# Non-interactive header + step runner
###############################################################################

NI_STEP=0
NI_TOTAL=0

ni_header() {
    printf "\n"
    printf "    _    ___ ____  _     ___ _   _ _  __\n"
    printf "   / \\  |_ _|  _ \\| |   |_ _| \\ | | |/ /\n"
    printf "  / _ \\  | || |_) | |    | ||  \\| | ' / \n"
    printf " / ___ \\ | ||  _ <| |___ | || |\\  | . \\ \n"
    printf "/_/   \\_\\___|_| \\_\\_____|___|_| \\_|_|\\_\\\n"
    printf "\n"
    printf "  ${BOLD}Airlink Installer${RESET} v${VERSION}  ${DIM}%s${RESET}\n\n" \
        "$(date '+%Y-%m-%d %H:%M:%S')"
}

ni_start() { NI_TOTAL="$1"; NI_STEP=0; }

ni_run() {
    local label="$1"; shift
    NI_STEP=$(( NI_STEP + 1 ))

    local outfile; outfile=$(mktemp /tmp/al-step-XXXXXX)
    local fi=0

    "$@" >"$outfile" 2>&1 &
    local pid=$!

    while kill -0 "$pid" 2>/dev/null; do
        printf "\r  ${DIM}[%02d/%02d]${RESET} %-44s ${_SPIN[$fi]}" \
            "$NI_STEP" "$NI_TOTAL" "$label"
        fi=$(( (fi + 1) % 4 ))
        sleep 0.1
    done

    wait "$pid"
    local status=$?

    if [[ $status -eq 0 ]]; then
        printf "\r  ${DIM}[%02d/%02d]${RESET} %-44s ${BOLD}done${RESET}\n" \
            "$NI_STEP" "$NI_TOTAL" "$label"
        _ok "$label"
    else
        printf "\r  ${DIM}[%02d/%02d]${RESET} %-44s ${BOLD}FAIL${RESET}\n" \
            "$NI_STEP" "$NI_TOTAL" "$label"
        local err_tail; err_tail=$(tail -n20 "$outfile" 2>/dev/null || true)
        rm -f "$outfile"
        _err "$label failed"
        printf "\n${BOLD}  failed:${RESET} %s\n\n%s\n\n" "$label" "$err_tail"
        exit 1
    fi

    rm -f "$outfile"
}

###############################################################################
# OS detection
###############################################################################

OS="" VER="" FAM="" PKG_TOOL=""

detect_os() {
    [[ -f /etc/os-release ]] || die "Cannot detect OS — /etc/os-release missing"
    OS=$(grep '^ID='          /etc/os-release | cut -d= -f2 | tr -d '"')
    VER=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

    case "$OS" in
        ubuntu|debian|linuxmint|pop|raspbian)
            FAM="debian"; PKG_TOOL="apt" ;;
        fedora|centos|rhel|rocky|almalinux|ol)
            FAM="redhat"
            command -v dnf &>/dev/null && PKG_TOOL="dnf" || PKG_TOOL="yum" ;;
        arch|manjaro|endeavouros) FAM="arch";   PKG_TOOL="pacman" ;;
        alpine)                   FAM="alpine";  PKG_TOOL="apk"    ;;
        *) die "Unsupported OS: $OS (supported: Ubuntu/Debian/Fedora/RHEL/Arch/Alpine)" ;;
    esac
    log "OS: $OS $VER ($FAM)"
}

pkg_install() {
    case "$PKG_TOOL" in
        apt)    DEBIAN_FRONTEND=noninteractive apt-get update -qq && \
                DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" ;;
        dnf|yum) $PKG_TOOL install -y -q "$@" ;;
        pacman) pacman -Sy --noconfirm --needed "$@" ;;
        apk)    apk add --no-cache -q "$@" ;;
    esac
}

###############################################################################
# Dependency check
###############################################################################

ensure_deps() {
    local deps=(curl wget git openssl unzip)
    local missing=()
    for d in "${deps[@]}"; do
        command -v "$d" &>/dev/null || missing+=("$d")
    done
    [[ ${#missing[@]} -gt 0 ]] && pkg_install "${missing[@]}"
    for d in "${deps[@]}"; do
        command -v "$d" &>/dev/null || die "Failed to install: $d"
    done
}

###############################################################################
# Node.js
###############################################################################

get_latest_node_lts() {
    local idx
    idx=$(curl -fsSL --max-time 15 "https://nodejs.org/dist/index.json" 2>/dev/null) || {
        log "WARN: cannot fetch node index, defaulting to 22"
        echo "22"; return
    }
    local lts_ver
    lts_ver=$(echo "$idx" | python3 -c "
import json,sys
data=json.load(sys.stdin)
for r in data:
    if r.get('lts') and r['lts'] is not False:
        print(r['version'].lstrip('v').split('.')[0])
        break
" 2>/dev/null) || true
    if [[ -z "$lts_ver" || ! "$lts_ver" =~ ^[0-9]+$ ]]; then echo "22"; else echo "$lts_ver"; fi
}

select_npm_registry() {
    local geo continent
    geo=$(curl -fsSL --max-time 8 "http://ip-api.com/json/?fields=continentCode" 2>/dev/null || echo "")
    continent=$(echo "$geo" | grep -o '"continentCode":"[^"]*"' | cut -d'"' -f4)
    case "$continent" in
        AS) PNPM_REGISTRY="https://registry.npmmirror.com"; log "Registry: npmmirror.com (Asia)" ;;
        *)  PNPM_REGISTRY="https://registry.npmjs.org";     log "Registry: npmjs.org" ;;
    esac
    curl -fsSL --max-time 6 "${PNPM_REGISTRY}/npm" -o /dev/null 2>/dev/null || \
        PNPM_REGISTRY="https://registry.npmjs.org"
}

setup_node() {
    local desired_major; desired_major=$(get_latest_node_lts)
    log "Latest Node LTS: $desired_major"

    if command -v node &>/dev/null; then
        local current_major
        current_major=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
        if [[ "$current_major" != "$desired_major" ]]; then
            log "Node mismatch: have $current_major, want $desired_major"
            _install_node "$desired_major"
        else
            log "Node.js $desired_major already installed"
        fi
    else
        _install_node "$desired_major"
    fi

    command -v node &>/dev/null || die "Node.js install failed"
    log "Node.js $(node -v) ready"

    select_npm_registry

    if ! command -v pnpm &>/dev/null; then
        npm install -g pnpm --registry "${PNPM_REGISTRY}" &>/dev/null || \
            npm install -g pnpm &>/dev/null || die "pnpm install failed"
    fi
    PNPM=$(command -v pnpm)
    "$PNPM" config set registry "${PNPM_REGISTRY}" &>/dev/null || true
    log "pnpm $("$PNPM" -v 2>/dev/null) ready"
}

_install_node() {
    local desired_major="$1"
    case "$FAM" in
        debian)
            curl -fsSL "https://deb.nodesource.com/setup_${desired_major}.x" | bash -
            DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
            ;;
        redhat)
            curl -fsSL "https://rpm.nodesource.com/setup_${desired_major}.x" | bash -
            $PKG_TOOL install -y -q nodejs
            ;;
        arch)   pacman -Sy --noconfirm --needed nodejs npm ;;
        alpine) apk add --no-cache nodejs npm ;;
    esac
}

###############################################################################
# Docker
###############################################################################

setup_docker() {
    if command -v docker &>/dev/null; then
        log "Docker already installed: $(docker --version 2>/dev/null | head -1)"
        systemctl is-active --quiet docker || systemctl enable --now docker &>/dev/null || true
        return 0
    fi
    case "$FAM" in
        debian|redhat) curl -fsSL https://get.docker.com | sh ;;
        arch)   pacman -Sy --noconfirm --needed docker docker-compose ;;
        alpine) apk add --no-cache docker docker-compose; rc-update add docker boot &>/dev/null || true ;;
    esac
    command -v systemctl &>/dev/null && systemctl enable --now docker &>/dev/null || true
    command -v docker &>/dev/null || die "Docker install failed"
}

###############################################################################
# Validation helpers
###############################################################################

valid_port() { [[ "$1" =~ ^[0-9]+$ ]] && [[ "$1" -ge 1 ]] && [[ "$1" -le 65535 ]]; }

get_addon_field() { echo "$1" | cut -d'|' -f"$2"; }

###############################################################################
# Daemon
###############################################################################

DAEMON_PLATFORM=""
DAEMON_ARCH=""

detect_platform() {
    local kernel arch
    kernel=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    case "$kernel" in
        linux)  DAEMON_PLATFORM="linux" ;;
        darwin) DAEMON_PLATFORM="macos" ;;
        *)      die "Unsupported platform: $kernel" ;;
    esac
    case "$arch" in
        x86_64|amd64)  DAEMON_ARCH="x64"   ;;
        aarch64|arm64) DAEMON_ARCH="arm64"  ;;
        *)             die "Unsupported architecture: $arch" ;;
    esac
}

phase_daemon_download() {
    detect_platform
    echo "Fetching latest daemon release..."

    local release_json tag asset_url
    release_json=$(curl -fsSL --max-time 30 "${DAEMON_RELEASE_API}" 2>/dev/null) \
        || die "Failed to fetch daemon release info from GitHub"

    tag=$(echo "$release_json" | python3 -c "
import json,sys
print(json.load(sys.stdin).get('tag_name','unknown'))
" 2>/dev/null) || tag="unknown"
    log "Latest daemon release: $tag"

    asset_url=$(echo "$release_json" | python3 -c "
import json,sys
platform,arch=sys.argv[1],sys.argv[2]
d=json.load(sys.stdin)
needle='airlinkd-'+platform+'-'+arch+'-'
for a in d.get('assets',[]):
    n=a.get('name','')
    if n.startswith(needle) and n.endswith('.zip'):
        print(a['browser_download_url']); break
" "$DAEMON_PLATFORM" "$DAEMON_ARCH" 2>/dev/null) || true

    [[ -z "$asset_url" ]] && die "No daemon binary found for ${DAEMON_PLATFORM}-${DAEMON_ARCH} in release $tag"
    log "Downloading: $asset_url"
    echo "Downloading airlinkd $tag for ${DAEMON_PLATFORM}-${DAEMON_ARCH}..."

    local tmpdir; tmpdir=$(mktemp -d /tmp/al-daemon-XXXXXX)
    curl -fsSL --max-time 120 -o "${tmpdir}/airlinkd.zip" "$asset_url" \
        || die "Failed to download daemon binary"
    unzip -o -q "${tmpdir}/airlinkd.zip" -d "$tmpdir" || die "Failed to unzip daemon binary"
    [[ -f "${tmpdir}/airlinkd" ]] || die "Binary 'airlinkd' not found inside zip"

    mkdir -p /etc/daemon
    cp "${tmpdir}/airlinkd" /etc/daemon/airlinkd
    chmod +x /etc/daemon/airlinkd
    rm -rf "$tmpdir"
    log "OK: airlinkd installed to /etc/daemon/airlinkd"

    if [[ ! -f /etc/daemon/.env ]]; then
        cat > /etc/daemon/.env <<ENVEOF
remote=${PANEL_ADDRESS}
key=${DAEMON_KEY}
port=${DAEMON_PORT}
DEBUG=false
version=1.0.0
environment=production
STATS_INTERVAL=10000
ENVEOF
    fi
}

phase_daemon_service() {
    cat > /etc/systemd/system/airlink-daemon.service <<SVCEOF
[Unit]
Description=Airlink Daemon
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/etc/daemon
EnvironmentFile=/etc/daemon/.env
ExecStart=/etc/daemon/airlinkd
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVCEOF
    systemctl daemon-reload
    systemctl enable --now airlink-daemon
}

###############################################################################
# Panel install phases
###############################################################################

phase_panel_clone() {
    mkdir -p /var/www

    if [[ -d /var/www/panel ]]; then
        echo "Panel already exists — updating files, keeping .env"
        local tmpdir; tmpdir=$(mktemp -d /tmp/al-panel-XXXXXX)
        git clone --depth 1 "${PANEL_REPO}" "$tmpdir" || die "Failed to clone panel"
        if command -v rsync &>/dev/null; then
            rsync -a --exclude='.env' --exclude='node_modules' \
                  --exclude='storage' "$tmpdir/" /var/www/panel/
        else
            find "$tmpdir" -mindepth 1 -maxdepth 1 \
                ! -name '.env' ! -name 'node_modules' ! -name 'storage' \
                -exec cp -r {} /var/www/panel/ \;
        fi
        rm -rf "$tmpdir"
    else
        cd /var/www || die "Cannot access /var/www"
        git clone --depth 1 "${PANEL_REPO}" panel || die "Failed to clone panel"
    fi

    id www-data &>/dev/null && chown -R www-data:www-data /var/www/panel
    chmod -R 755 /var/www/panel

    # Patch package.json for pnpm onlyBuiltDependencies
    command -v python3 &>/dev/null && python3 - /var/www/panel/package.json <<'PYEOF'
import json, sys
f = sys.argv[1]
with open(f) as fh:
    d = json.load(fh)
d.setdefault("pnpm", {})["onlyBuiltDependencies"] = [
    "@parcel/watcher", "@prisma/client", "@prisma/engines", "prisma"
]
with open(f, "w") as fh:
    json.dump(d, fh, indent=2)
    fh.write("\n")
PYEOF

    # Generate .env if missing
    if [[ ! -f /var/www/panel/.env ]]; then
        local secret server_ip panel_url
        secret=$(openssl rand -hex 32)
        server_ip=$(hostname -I 2>/dev/null | awk '{print $1}') || server_ip="localhost"
        [[ -z "$server_ip" ]] && server_ip="localhost"
        panel_url="${PANEL_URL:-http://${server_ip}:${PANEL_PORT}}"
        cat > /var/www/panel/.env <<ENVEOF
# ── Core ──────────────────────────────────────────────────────────────────────
NAME="${PANEL_NAME}"
NODE_ENV=production
URL="${panel_url}"
PORT=${PANEL_PORT}

# ── Session ───────────────────────────────────────────────────────────────────
SESSION_SECRET=${secret}
SESSION_MAX_AGE_MS=604800000

# ── Reverse Proxy / HTTPS ─────────────────────────────────────────────────────
TRUST_PROXY="${PANEL_TRUST_PROXY}"
COOKIE_DOMAIN="${PANEL_COOKIE_DOMAIN}"

# ── Asset Delivery ────────────────────────────────────────────────────────────
ASSET_BASE_URL=""

# ── Content Security Policy ───────────────────────────────────────────────────
CSP_ENABLED="${PANEL_CSP_ENABLED}"

# ── Rate Limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_MAX=${PANEL_RATE_LIMIT}
RATE_LIMIT_WINDOW_MS=60000

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL="${PANEL_LOG_LEVEL}"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=file:/var/www/panel/storage/dev.db
DB_POOL_MAX=20

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=""

# ── SMTP / Email ──────────────────────────────────────────────────────────────
SMTP_HOST="${PANEL_SMTP_HOST}"
SMTP_PORT=587
SMTP_FROM=""
SMTP_SECURE="true"
ENVEOF
    fi
}

phase_panel_deps() {
    cd /var/www/panel || die "Panel directory missing"
    NODE_ENV=development "$PNPM" install --no-frozen-lockfile \
        --store-dir "$PNPM_STORE" --network-concurrency 16 \
        || die "Panel dependency install failed"
    "$PNPM" approve-builds --all || true
    "$PNPM" add chalk form-data --store-dir "$PNPM_STORE" \
        || die "chalk/form-data install failed"
}

phase_panel_build() {
    cd /var/www/panel || die "Panel directory missing"
    "$PNPM" run migrate:deploy || die "Database migration failed"
    "$PNPM" run build          || die "Panel build failed"
}

phase_panel_service() {
    local pnpm_bin node_bin_dir
    pnpm_bin=$(command -v pnpm)
    node_bin_dir=$(dirname "$(command -v node)")

    cat > /etc/systemd/system/airlink-panel.service <<SVCEOF
[Unit]
Description=Airlink Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/panel
EnvironmentFile=/var/www/panel/.env
ExecStart=${pnpm_bin} run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=${node_bin_dir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
SVCEOF
    systemctl daemon-reload
    systemctl enable --now airlink-panel
    _process_addons
}

###############################################################################
# Addons
###############################################################################

_process_addons() {
    [[ -z "${ADDON_CHOICES:-}" || "${ADDON_CHOICES}" == "none" ]] && return 0

    local to_install=()
    if [[ "$ADDON_CHOICES" == "all" ]]; then
        to_install=("${ADDONS[@]}")
    else
        IFS=',' read -ra selected <<< "$ADDON_CHOICES"
        for sel in "${selected[@]}"; do
            for addon in "${ADDONS[@]}"; do
                [[ "$(get_addon_field "$addon" 4)" == "$sel" ]] && to_install+=("$addon") && break
            done
        done
    fi

    local addons_dir="/var/www/panel/storage/addons"
    mkdir -p "$addons_dir"

    for addon_config in "${to_install[@]}"; do
        local display_name repo_url branch dir_name
        display_name=$(get_addon_field "$addon_config" 1)
        repo_url=$(get_addon_field "$addon_config" 2)
        branch=$(get_addon_field "$addon_config" 3)
        dir_name=$(get_addon_field "$addon_config" 4)

        local target="${addons_dir}/${dir_name}"
        if [[ -d "$target" ]]; then
            cd "$target" && git pull origin "$branch" &>/dev/null || true
        else
            git clone --depth 1 --branch "$branch" "$repo_url" "$target" \
                || die "Failed to clone $display_name"
            cd "$target"
        fi

        "$PNPM" install --no-frozen-lockfile --store-dir "$PNPM_STORE" \
            || die "$display_name install failed"
        "$PNPM" run build || die "$display_name build failed"
        log "OK: $display_name addon done"
    done

    cd /var/www/panel
    npx tailwindcss -i ./public/styles/tw.css -o ./public/styles.css &>/dev/null || true
}

###############################################################################
# Removal helpers
###############################################################################

_remove_panel() {
    systemctl stop    airlink-panel &>/dev/null || true
    systemctl disable airlink-panel &>/dev/null || true
    rm -f /etc/systemd/system/airlink-panel.service
    rm -rf /var/www/panel
    systemctl daemon-reload
}

_remove_daemon() {
    systemctl stop    airlink-daemon &>/dev/null || true
    systemctl disable airlink-daemon &>/dev/null || true
    rm -f /etc/systemd/system/airlink-daemon.service
    rm -rf /etc/daemon
    systemctl daemon-reload
}

_remove_deps() {
    case "$FAM" in
        debian) apt-get remove -y nodejs npm docker.io docker-ce docker-ce-cli &>/dev/null || true ;;
        redhat) $PKG_TOOL remove -y nodejs npm docker-ce docker-ce-cli &>/dev/null || true ;;
        arch)   pacman -R --noconfirm nodejs npm docker &>/dev/null || true ;;
        alpine) apk del nodejs npm docker &>/dev/null || true ;;
    esac
}

ping_install_counter() {
    curl -sf "https://api.counterapi.dev/v2/airlinklabs/installed-air/up" -o /dev/null 2>/dev/null || true
}

###############################################################################
# TUI config collection
###############################################################################

PANEL_NAME="Airlink"
PANEL_PORT="3000"
PANEL_ADDRESS="127.0.0.1"
DAEMON_PORT="3002"
DAEMON_KEY=""
ADDON_CHOICES="none"
PANEL_URL=""
PANEL_TRUST_PROXY="false"
PANEL_COOKIE_DOMAIN=""
PANEL_CSP_ENABLED=""
PANEL_RATE_LIMIT="500"
PANEL_LOG_LEVEL="info"
PANEL_SMTP_HOST=""

tui_collect_panel_config() {
    tui_input "Panel name" "Airlink"
    PANEL_NAME="$TUI_INPUT"

    local err=""
    while true; do
        tui_input "Panel port (1-65535)" "3000" "$err"
        valid_port "$TUI_INPUT" && PANEL_PORT="$TUI_INPUT" && break
        err="Invalid port — must be 1-65535"
    done

    tui_input "Panel URL (empty = auto-detect from server IP)" ""
    [[ -n "$TUI_INPUT" ]] && PANEL_URL="$TUI_INPUT"

    tui_confirm "Enable trust proxy? (for Nginx / Caddy / Cloudflare)" && PANEL_TRUST_PROXY="true"
    tui_confirm "Enable Content Security Policy?"                       && PANEL_CSP_ENABLED="true"

    tui_input "Rate limit requests/min (0 = unlimited)" "500"
    [[ -n "$TUI_INPUT" ]] && PANEL_RATE_LIMIT="$TUI_INPUT"

    tui_input "SMTP host (empty to skip email setup)" ""
    [[ -n "$TUI_INPUT" ]] && PANEL_SMTP_HOST="$TUI_INPUT"
}

tui_collect_daemon_config() {
    tui_input "Panel address (IP or hostname the daemon connects to)" "127.0.0.1"
    PANEL_ADDRESS="$TUI_INPUT"

    local err=""
    while true; do
        tui_input "Daemon port (1-65535)" "3002" "$err"
        valid_port "$TUI_INPUT" && DAEMON_PORT="$TUI_INPUT" && break
        err="Invalid port — must be 1-65535"
    done

    tui_input "Daemon auth key (from Panel → Nodes)" ""
    DAEMON_KEY="$TUI_INPUT"
}

tui_collect_addons() {
    local names=()
    for addon in "${ADDONS[@]}"; do names+=("$(get_addon_field "$addon" 1)"); done
    tui_checklist "Optional Addons" "${names[@]}"
    if [[ -z "$TUI_MULTI" ]]; then ADDON_CHOICES="none"; return; fi
    local chosen=()
    for idx in $TUI_MULTI; do chosen+=("$(get_addon_field "${ADDONS[$idx]}" 4)"); done
    IFS=',' ADDON_CHOICES="${chosen[*]}"
}

###############################################################################
# TUI install runner
###############################################################################

tui_do_install() {
    local mode="$1"
    local tasks=()

    case "$mode" in
        both)
            tasks=(
                "Check dependencies" "Install Node.js" "Install Docker"
                "Clone panel" "Install panel dependencies" "Build panel" "Start panel service"
                "Download daemon binary" "Start daemon service"
            ) ;;
        panel)
            tasks=(
                "Check dependencies" "Install Node.js" "Install Docker"
                "Clone panel" "Install panel dependencies" "Build panel" "Start panel service"
            ) ;;
        daemon)
            tasks=(
                "Check dependencies" "Install Docker"
                "Download daemon binary" "Start daemon service"
            ) ;;
    esac

    tui_progress_init "${tasks[@]}"
    stty echo 2>/dev/null || true
    _INSTALLING=1

    tui_progress_step ensure_deps

    [[ "$mode" == "both" || "$mode" == "panel" ]] && tui_progress_step setup_node
    tui_progress_step setup_docker

    if [[ "$mode" == "both" || "$mode" == "panel" ]]; then
        tui_progress_step phase_panel_clone
        tui_progress_step phase_panel_deps
        tui_progress_step phase_panel_build
        tui_progress_step phase_panel_service
    fi

    if [[ "$mode" == "both" || "$mode" == "daemon" ]]; then
        tui_progress_step phase_daemon_download
        tui_progress_step phase_daemon_service
    fi

    tui_progress_finish
    _INSTALLING=0
    ping_install_counter
}

tui_view_logs() {
    _tui_cleanup
    if [[ -f "$LOG" ]]; then less "$LOG" || cat "$LOG"; else echo "No log at $LOG"; sleep 2; fi
    _tui_init
}

###############################################################################
# Interactive main menu
###############################################################################

run_interactive() {
    _tui_init

    local menu_items=(
        "Install Panel + Daemon"
        "Install Panel only"
        "Install Daemon only"
        "Install Addons only"
        "Setup dependencies only"
        "Remove Panel"
        "Remove Daemon"
        "Remove everything"
        "View logs"
        "Exit"
    )

    while true; do
        tui_menu "Main Menu" "${menu_items[@]}" || break

        case $TUI_RESULT in
            0)  tui_collect_panel_config; tui_collect_daemon_config; tui_collect_addons; tui_do_install "both" ;;
            1)  tui_collect_panel_config; tui_collect_addons; tui_do_install "panel" ;;
            2)  tui_collect_daemon_config; tui_do_install "daemon" ;;
            3)  tui_collect_addons; stty echo 2>/dev/null || true; _process_addons; stty -echo 2>/dev/null || true ;;
            4)  stty echo 2>/dev/null || true; ensure_deps; setup_node; setup_docker; stty -echo 2>/dev/null || true ;;
            5)  tui_confirm "Remove panel? This deletes /var/www/panel" && tui_run "Removing panel" _remove_panel ;;
            6)  tui_confirm "Remove daemon? This deletes /etc/daemon"   && tui_run "Removing daemon" _remove_daemon ;;
            7)
                if tui_confirm "Remove panel, daemon, and all dependencies?"; then
                    tui_run "Removing panel"        _remove_panel
                    tui_run "Removing daemon"       _remove_daemon
                    tui_run "Removing dependencies" _remove_deps
                fi
                ;;
            8)  tui_view_logs ;;
            9|-1) break ;;
        esac
    done

    _tui_cleanup
    printf "\n  Airlink Installer v${VERSION} — done\n\n"
}

###############################################################################
# Non-interactive entry point
###############################################################################

run_noninteractive() {
    ni_header

    local mode="${ARG_MODE:-both}"

    PANEL_NAME="${ARG_NAME:-Airlink}"
    PANEL_PORT="${ARG_PORT:-3000}"
    PANEL_ADDRESS="${ARG_PANEL_ADDR:-127.0.0.1}"
    DAEMON_PORT="${ARG_DAEMON_PORT:-3002}"
    DAEMON_KEY="${ARG_DAEMON_KEY:-}"
    ADDON_CHOICES="${ARG_ADDONS:-none}"
    PANEL_URL="${ARG_URL:-}"
    PANEL_TRUST_PROXY="${ARG_TRUST_PROXY:-false}"
    PANEL_COOKIE_DOMAIN="${ARG_COOKIE_DOMAIN:-}"
    PANEL_CSP_ENABLED="${ARG_CSP_ENABLED:-}"
    PANEL_RATE_LIMIT="${ARG_RATE_LIMIT:-500}"
    PANEL_LOG_LEVEL="${ARG_LOG_LEVEL:-info}"
    PANEL_SMTP_HOST="${ARG_SMTP_HOST:-}"

    [[ "$mode" != "daemon" ]] && ! valid_port "$PANEL_PORT"  && die "Invalid panel port: $PANEL_PORT"
    [[ "$mode" != "panel"  ]] && ! valid_port "$DAEMON_PORT" && die "Invalid daemon port: $DAEMON_PORT"
    command -v systemctl &>/dev/null || die "systemd is required for non-interactive mode"

    case "$mode" in
        both)
            ni_start 9
            ni_run "Checking dependencies"   ensure_deps
            ni_run "Setting up Node.js"      setup_node
            ni_run "Setting up Docker"       setup_docker
            ni_run "Cloning panel"           phase_panel_clone
            ni_run "Installing panel deps"   phase_panel_deps
            ni_run "Building panel"          phase_panel_build
            ni_run "Starting panel service"  phase_panel_service
            ni_run "Downloading daemon"      phase_daemon_download
            ni_run "Starting daemon service" phase_daemon_service
            ;;
        panel)
            ni_start 7
            ni_run "Checking dependencies"   ensure_deps
            ni_run "Setting up Node.js"      setup_node
            ni_run "Setting up Docker"       setup_docker
            ni_run "Cloning panel"           phase_panel_clone
            ni_run "Installing panel deps"   phase_panel_deps
            ni_run "Building panel"          phase_panel_build
            ni_run "Starting panel service"  phase_panel_service
            ;;
        daemon)
            ni_start 4
            ni_run "Checking dependencies"   ensure_deps
            ni_run "Setting up Docker"       setup_docker
            ni_run "Downloading daemon"      phase_daemon_download
            ni_run "Starting daemon service" phase_daemon_service
            ;;
        *) die "Unknown mode: $mode (valid: both, panel, daemon)" ;;
    esac

    ping_install_counter

    local server_ip
    server_ip=$(hostname -I 2>/dev/null | awk '{print $1}') || server_ip="<server-ip>"

    printf "\n  ${BOLD}Installation complete.${RESET}\n\n"
    [[ "$mode" != "daemon" ]] && printf "  Panel :  http://%s:%s\n" "$server_ip" "$PANEL_PORT"
    [[ "$mode" != "panel"  ]] && printf "  Daemon:  port %s\n" "$DAEMON_PORT"
    printf "  Logs  :  %s\n" "$LOG"
    printf "  System:  journalctl -u airlink-panel -f\n\n"
}

###############################################################################
# Entry point
###############################################################################

[[ $EUID -eq 0 ]] || { echo "Run as root or with sudo."; exit 1; }

touch "$LOG" 2>/dev/null || true
log "=== Airlink Installer v${VERSION} started (pid $$) ==="

parse_args "$@"
detect_os

if noninteractive; then
    run_noninteractive
else
    run_interactive
fi
