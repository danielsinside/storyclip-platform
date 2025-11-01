# -------- STAGE 1: build deps + ffmpeg full --------
FROM ubuntu:22.04 AS ffbuild
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential pkg-config cmake meson ninja-build autoconf automake libtool \
    yasm nasm python3 python3-pip python3-venv curl ca-certificates wget unzip \
    libfreetype6-dev libfontconfig1-dev libfribidi-dev libharfbuzz-dev \
    libass-dev libvorbis-dev libopus-dev libmp3lame-dev libnuma-dev \
    libgnutls28-dev zlib1g-dev libbz2-dev libzstd-dev libssl-dev \
    libxcb1-dev libxcb-shm0-dev libxcb-xfixes0-dev libvpx-dev libwebp-dev libspeex-dev && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /usr/local/src/ffmpeg-build

# dav1d
RUN git clone https://code.videolan.org/videolan/dav1d.git && cd dav1d && \
    meson setup build --prefix=/usr/local --buildtype=release && \
    ninja -C build && ninja -C build install

# aom (AV1)
RUN git clone https://aomedia.googlesource.com/aom && cd aom && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DENABLE_TESTS=0 -DENABLE_DOCS=0 .. && \
    make -j"$(nproc)" && make install

# SVT-AV1 (encoder AV1 rápido)
RUN git clone https://gitlab.com/AOMediaCodec/SVT-AV1.git && cd SVT-AV1 && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local .. && \
    make -j"$(nproc)" && make install

# x264
RUN git clone https://code.videolan.org/videolan/x264.git && cd x264 && \
    ./configure --prefix=/usr/local --enable-pic --enable-lto && make -j"$(nproc)" && make install

# x265
RUN git clone https://bitbucket.org/multicoreware/x265_git.git && cd x265_git/build/linux && \
    cmake -G "Unix Makefiles" -DCMAKE_INSTALL_PREFIX=/usr/local -DENABLE_SHARED=on ../../source && \
    make -j"$(nproc)" && make install

# vid.stab
RUN git clone https://github.com/georgmartius/vid.stab.git && cd vid.stab && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/local . && make -j"$(nproc)" && make install

# vmaf
RUN git clone https://github.com/Netflix/vmaf.git && cd vmaf && \
    make -j"$(nproc)" libvmaf && make install

# frei0r
RUN git clone https://github.com/dyne/frei0r.git && cd frei0r && \
    mkdir build && cd build && cmake -DCMAKE_INSTALL_PREFIX=/usr/local .. && \
    make -j"$(nproc)" && make install

# FFmpeg 8.0 (tag n8.0)
RUN git clone https://git.ffmpeg.org/ffmpeg.git && cd ffmpeg && \
    git fetch --tags && git checkout -f n8.0 && \
    ./configure --prefix=/usr/local \
      --enable-gpl --enable-nonfree \
      --enable-libx264 --enable-libx265 \
      --enable-libdav1d --enable-libaom --enable-libsvtav1 \
      --enable-libmp3lame --enable-libopus --enable-libvorbis \
      --enable-libass --enable-libfreetype --enable-libfontconfig \
      --enable-libvmaf --enable-libvidstab --enable-frei0r --enable-libwebp --enable-libspeex \
      --enable-swscale --enable-swresample --enable-avfilter \
      --enable-pthreads --enable-lto --enable-version3 && \
    make -j"$(nproc)" && make install

# -------- STAGE 2: runtime (Node + ffmpeg) --------
FROM node:20-slim AS app
ARG DEBIAN_FRONTEND=noninteractive
# libs runtime para ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfreetype6 libfontconfig1 libfribidi0 libharfbuzz0b \
    libass9 libvorbis0a libopus0 libmp3lame0 libgnutls30 zlib1g libbz2-1.0 libzstd1 libssl3 \
    libvpx7 libwebp7 libspeex1 ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*
COPY --from=ffbuild /usr/local /usr/local
RUN ldconfig

# App files
WORKDIR /srv/storyclip
# (si usas monorepo ajusta COPY)
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Puerto de tu API (ajústalo si usas otro)
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]











