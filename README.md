# MCP-SEC

MCP Server with network tools (ping, etc.)

## 本地运行

```bash
npm install
npm start
```

## 部署到阿里云 CAP

### 方式一：网页控制台（推荐）

1. 访问 https://cap.console.aliyun.com/
2. 新建项目 → 空白项目
3. 选择运行环境：Node.js 20
4. 代码来源：选择代码包，直接上传这里的内容
5. 配置构建命令：`npm install`
6. 部署

### 方式二：CLI 部署

```bash
s deploy
```

## 工具

### ping
Ping 一个主机检查网络连通性

**参数：**
- `host` (可选): 要 ping 的主机，默认 127.0.0.1

**示例：**
```json
{
  "name": "ping",
  "arguments": {
    "host": "127.0.0.1"
  }
}
```