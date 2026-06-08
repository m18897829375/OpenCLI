# OpenCLI 内置 CLI 工具索引

> 仅列出站点名。具体命令用 `opencli list` 或 `opencli <site>` 动态获取。

## 社交媒体
weibo, twitter, douyin, xiaohongshu, zhihu, bluesky, tiktok, tieba, v2ex, linux-do, reddit, instagram, facebook, discord-app, douban, jike, maimai, sinablog

## 电商
taobao, jd, amazon, 1688, smzdm, xianyu, coupang

## AI / LLM
chatgpt, claude, deepseek, gemini, kimi, grok, qwen, doubao, yuanbao, manus, cursor, trae-cn, trae-solo, codex, qoder, chatwise, jimeng, suno, notebooklm, antigravity

## 技术开发
github, npm, pypi, crates, maven, rubygems, nuget, packagist, dockerhub, homebrew, flathub, stackoverflow, gitee

## 搜索引擎 / 百科
google, duckduckgo, brave, bing (web), wikipedia, wikidata, baidu-scholar, google-scholar

## 视频 / 直播
bilibili, youtube, tiktok, bbc, spotify, apple-podcasts, xiaoyuzhou

## 招聘求职
boss, 51job, linkedin, indeed, upwork, nowcoder

## 金融财经
sinafinance, eastmoney, xueqiu, binance, coingecko, defillama, ths, yahoo-finance, bloomberg

## 资讯新闻
36kr, toutiao, hupu, producthunt, hackernews, devto, medium, substack, lobsters, lesswrong

## 学术知识
arxiv, cnki, pubmed, wanfang, dblp, oeis, openalex, openreview, paperreview, rfc, nvd, osv, openfda

## 工具 / 效率
wttr, dictionary, rest-countries, endoflife, tvmaze, chess, lichess, geogebra, uisdc, uiverse, web, mdn, playwright

## 出行旅游
ctrip, booking, 12306

## 本地生活
dianping, xiaoe, ones, jianyu, mubu, flomo

## 企业协作
atlassian (confluence/jira), lark (feishu), wechat-channels, weixin, weread, weread-official, zsxq

## 视频图片
pixiv, doubao-app, chaoxing

## 政府 / 法律
gov-law, gov-policy

## 其他
steam, spotify, zlibrary, hf, band, barchart, yahoo, youdao, powerchina, aibase, linkedin-learning, ke, quark, reuters, goproxy, yollomi

## 浏览器自动化（内置工具）

> ⭐ **Playwright CLI 为首选方案**。MCP 工具作为辅助，`opencli browser` 仅用于需登录 Cookie 的场景。

`playwright` ⭐ 首选 — `opencli playwright navigate|snapshot|click|type|evaluate|screenshot`（CLI 适配器，`clis/playwright/`）。daemon 模式保持 Chrome 进程常驻，跨命令复用。**CLI 失效时可用 MCP 工具备选。** 安装: `claude mcp add playwright -- npx -y @playwright/mcp@latest`。**⚠️ 禁止编写脚本封装。**

`opencli browser` 备选 — OpenCLI 原生浏览器驱动（selector-first 合约，需 Chrome + OpenCLI 扩展）。仅在需要已登录 Cookie 时使用。
