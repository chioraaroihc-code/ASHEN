# 🩸灰烬之桥预设快捷控制台 · 插件版 3.1.0

这是 SillyTavern 浏览器 UI 扩展，包含 `manifest.json` 和 `index.js`。入口直接挂在酒馆主页面，不使用酒馆助手脚本 iframe。

## 安装（Git 仓库方式，无需服务器后台）

酒馆“安装扩展”通常接收 Git 仓库地址，本 ZIP 不能当作脚本库 JSON 导入，也不能直接填入安装网址。

1. 解压 ZIP。在 GitHub 建一个自己的仓库，例如 `ST-AshenBridge-Console`。
2. 通过 GitHub 网页“Add file → Upload files”，将插件文件夹**里面的文件**上传到仓库根目录。根目录必须直接有 `manifest.json`、`index.js`；不要多套一层文件夹。README 和能力说明可一并上传。不需要 npm 或编译。
3. 酒馆网页 → 扩展 → 安装扩展，填你的 Git 仓库地址，然后刷新酒馆页面。
4. 在酒馆助手脚本库中禁用旧控制台 v3/v3.0.1，避免两套 UI 同时运行。**酒馆助手扩展本身保留启用。**
5. 在扩展设置中找到“🩸灰烬之桥控制台”。可以点“打开控制台”；“恢复血滴入口”会重置当前浏览器的入口位置并打开面板。

如果你选择手动文件安装：将整个插件目录放到你实际酒馆安装位置的 `public/scripts/extensions/third-party/ST-AshenBridge-Console` 下，再刷新页面。云端服务的实际目录和权限由服务方决定。不要将 ZIP 直接丢进脚本库。

当前交付是本地源码及 ZIP，**尚未发布到任何 GitHub 仓库**。不会给你一个未存在的安装网址。

## 依赖与存储

- 主页面入口和扩展设置按钮不依赖脚本库启动。
- 预设读取／开关修改仍需要已安装 TavernHelper 的 `window.TavernHelper.getPreset`、`updatePresetWith`、`getLoadedPresetName`；模式配置需要 `getVariables`、`updateVariablesWith`。不复制小冰块的内部 Prompt Manager 导入路径。
- 声明基准：TavernHelper 4.8.19 / `36d8889a99f1cf09d3d1f8aabd0eba33975dc64d`。用户安装版的实际能力未捕获；调用时探测函数，缺失或尚未初始化时面板显示错误，可以稍后点刷新重试。
- 沿用 `$ashenBridgeConsoleV3` 全局变量存储及原有预设名称，已有 v3 模式配置可继续读取。入口坐标仍是浏览器本地配置。
- 同一服务器同账户的另一设备需要刷新酒馆页面后读取服务端已保存的模式配置；不提供实时同步或多设备事务锁。

## 功能和修改范围

自动读取百百原生分组，原顺序展示当前顺序表条目；搜索、折叠、分组／匹配项批量开关；模式范围选择、保存当前 enabled、应用、改名、删除、前后排序、导入导出。模式只修改记录的条目；不按名称猜测失效 ID，不改写正文、role、条目顺序或采样参数。原预设文件未修改。

手机与桌面采用同一套紧凑可滚动面板。触摸拖动超过阈值才移动入口，正常点击打开；模式排序使用按钮，不依赖 HTML5 拖拽。

## 验证与下一步

已完成 JS 语法、扩展 manifest、相同数据逻辑的正文／范围保留检查。模拟浏览器在桌面、390px/320px 手机和短横屏尺寸验证开关、模式编辑与应用、排序、删除确认、导入导出、触摸点击、拖动与键盘、主页面直接启动、独立于 iframe 的生命周期、原生设置入口及清理。

这些是开发测试；**没有在你的酒馆中安装，也尚未验证手机 Edge 真机、真实扩展加载／启禁用或真实跨设备保存**。安装后请先确认扩展设置里的按钮出现，测试单条开关与原生 Prompt Manager 同步，再测试模式和手机滚动。仍不显示时请提供扩展设置页面截图及浏览器错误，而不是重复安装脚本包。

接口证据与原参考仓库：

- https://github.com/nai040720-svg/ST-XiaoBingKuai
- https://github.com/N0VI028/JS-Slash-Runner/blob/36d8889a99f1cf09d3d1f8aabd0eba33975dc64d/@types/function/preset.d.ts
- https://github.com/N0VI028/JS-Slash-Runner/blob/36d8889a99f1cf09d3d1f8aabd0eba33975dc64d/@types/function/variables.d.ts

独立编写实现；不含原预设 prompt 正文副本、用户聊天、API 密钥、远程脚本加载或自动部署。
