#!/bin/bash

# ================= 配置区域 =================
ENCODE_PARAMS="-c:v hevc_videotoolbox -q:v 65 -c:a copy" # 编码参数
EXT=".mp4" # 输出文件后缀
PREFIX="[CPS]" # 输出文件名前缀
VIDEO_FORMATS="mp4|mkv|mov|avi|flv|wmv|ts" # 支持的视频格式后缀
# ===========================================

if ! command -v ffmpeg &> /dev/null || ! command -v ffprobe &> /dev/null; then
    echo -e "\033[31m错误: 未找到 ffmpeg 或 ffprobe。\033[0m"
    exit 1
fi

clear
echo -e "\033[32m========================================================\033[0m"
echo -e "\033[32m       FFmpeg 文件夹自动遍历视频压缩脚本 参数65              \033[0m"
echo -e "\033[32m========================================================\033[0m"

while true; do
    echo ""
    echo -e "\033[33m[等待输入] 请拖入文件或文件夹，然后按回车开始 (按 Ctrl+C 退出):\033[0m"
    read -r raw_input
    
    eval "dropped_items=($raw_input)"
    [ ${#dropped_items[@]} -eq 0 ] && continue

    input_files=()
    for item in "${dropped_items[@]}"; do
        if [ -d "$item" ]; then
            # 修复点：使用 macOS 兼容的 find -E 命令
            while IFS=  read -r -d $'\0'; do
                if [[ ! $(basename "$REPLY") == "$PREFIX"* ]]; then
                    input_files+=("$REPLY")
                fi
            done < <(find -E "$item" -type f -iregex ".*\.($VIDEO_FORMATS)" -print0)
        elif [ -f "$item" ]; then
            input_files+=("$item")
        fi
    done

    total=${#input_files[@]}
    if [ $total -eq 0 ]; then
        echo -e "\033[31m未发现可处理的视频文件。\033[0m"
        continue
    fi

    echo -e "\033[32m共发现 $total 个视频文件，开始处理...\033[0m"
    count=0
    start_time=$(date +%s)

    for input_file in "${input_files[@]}"; do
        ((count++))
        dir_name=$(dirname "$input_file")
        base_name=$(basename "$input_file")
        filename_no_ext="${base_name%.*}"
        output_file="$dir_name/${PREFIX}${filename_no_ext}${EXT}"

        if [ -f "$output_file" ]; then
            jk=0
            while [ -f "$output_file" ]; do
                ((jk++))
                output_file="$dir_name/${PREFIX}${filename_no_ext}~${jk}${EXT}"
            done
        fi

        duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input_file")
        
        echo ""
        echo -e "\033[1;34m▶ 任务 [$count/$total]\033[0m"
        echo -e "  源文件: \033[37m$input_file\033[0m"

        ffmpeg -i "$input_file" $ENCODE_PARAMS -progress pipe:1 -nostats -loglevel error -y "$output_file" | awk -v total_dur="$duration" '
        BEGIN { FS="=" }
        /out_time_us/ { curr=$2/1000000 }
        /speed/ { spd=$2 }
        /bitrate/ { bit=$2 }
        /out_time=/ { time_str=substr($2, 1, 8) }
        {
            if (curr > 0) {
                pct = (curr / total_dur) * 100;
                if (pct > 100) pct = 100;
                spd_num = spd; gsub(/x/, "", spd_num);
                if (spd_num > 0) {
                    rem_sec = (total_dur - curr) / spd_num;
                    rem_m = int(rem_sec / 60); rem_s = int(rem_sec % 60);
                    eta = sprintf("%02d:%02d", rem_m, rem_s);
                } else { eta = "--:--"; }
                printf "\r  \033[32m进度: %.2f%% \033[0m| 已处: %s | 速度: %s | 码率: %s | 剩余: %s \033[K", pct, time_str, spd, bit, eta
                system("")
            }
        }
        END { printf "\n" }'

        if [ $? -eq 0 ] && [ -s "$output_file" ]; then
            touch -r "$input_file" "$output_file"
            echo -e "  \033[32m✓ 处理成功\033[0m"
        else
            echo -e "  \033[31m✗ 处理失败\033[0m"
            [ -f "$output_file" ] && [ ! -s "$output_file" ] && rm "$output_file"
        fi
    done

    total_cost=$(($(date +%s) - start_time))
    echo -e "\n\033[1;32m--------------------------------------------------------\033[0m"
    echo -e "\033[32m✔ 本次批次处理完毕! 总耗时: ${total_cost}s\033[0m"
    echo -e "\033[1;32m----------------------------------------------------------\033[0m"
done