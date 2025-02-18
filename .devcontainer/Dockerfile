# 使用官方的Node.js运行时作为基础镜像
FROM node:14-buster

# 安装依赖
RUN apt-get update && \
    apt-get install -y \
    git \
    curl \
    build-essential \
    # 安装额外的依赖包
    libnss3-tools \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /workspace

# 默认命令
CMD ["bash"]
