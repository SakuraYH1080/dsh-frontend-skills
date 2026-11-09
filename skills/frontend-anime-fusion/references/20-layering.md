# 20 · 分层与遮罩：四层，不许加第五层

## 1. 为什么是四层

层数不是审美选择，是**遮挡关系的完备集**：角色要能被背景从后面托住，要能被面板从前面压住，要能被前景轻微盖一下。三种关系加角色本身 = 四层。多加一层，一定是因为某一层做了两件事。

| 层 | z-index | 只负责 | 禁止 | 失效症状 |
| --- | --- | --- | --- | --- |
| L0 背景环境 | 0 | 色块、渐变、远景剪影、地面线 | 放角色、放正文 | 背景有细节 → 与角色抢注意力 |
| L1 角色 | 10 | 立绘本体 + 边缘光 | 放可点击控件 | 角色上有按钮 → 点击热区与视觉层级冲突 |
| L2 界面面板 | 20 | 所有文字、按钮、输入 | 再造一层材质（backdrop-filter） | 面板有玻璃 → 越界到 liquid-glass |
| L3 前景氛围 | 30 | 光斑、花瓣、不超过 3% 屏高的浅景深遮挡 | 覆盖文字、拦截指针 | 前景盖字 → 可读性归零 |

**判据**：任意可见元素能被指认属于哪一层。指认不出 = 层结构坏了，先修结构再加样式。

```css
.af-stage { position: relative; isolation: isolate; }
.af-stage > * { position: absolute; }
.af-l0 { z-index: 0; }
.af-l1 { z-index: 10; }
.af-l2 { z-index: 20; }
.af-l3 { z-index: 30; pointer-events: none; }
```

isolation: isolate 必须写：否则 mix-blend-mode 会穿透到页面根，把整个 body 混进去，颜色随滚动变化。

## 2. mask-image 渐隐

**为什么需要**：立绘是抠图，抠图有硬边。硬边意味着「这张图被剪下来了」；渐隐意味着「它长在这个空间里」。

| 边 | 处理 | 数值 | 反例 |
| --- | --- | --- | --- |
| 底边 | 渐隐到透明 | 底部 8–14% 角色高 | 底边硬切 → 角色像站在纸片边缘 |
| 侧边 | 不做渐隐 | — | 两侧都渐隐 → 角色像被雾包裹，失去体积 |
| 顶边 | 不做 | — | 顶边渐隐 → 头发消失，最贵的细节没了 |

```css
.af-char__img {
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%);
}
```

用百分比而非 px：移动端 char-h 降到 48–58% 时渐隐带的绝对值会变硬，百分比自动跟随。

**与 drop-shadow 冲突**：mask 会裁掉 mask 区域外的 drop-shadow。边缘发光与底边渐隐二选一时选底边渐隐，改在背景上补光斑。

## 3. mix-blend-mode 正误

混合模式的作用是让角色**继承背景的环境色**，代价是固有色被改写。

| 用法 | 判定 | 说明 |
| --- | --- | --- |
| 角色上叠一层背景主色，soft-light，不透明度 6–12% | 正确 | 只影响明暗关系，色相基本不变 |
| 角色 multiply 在浅背景上 | 有限正确 | 只用于「背影 / 逆光剪影」这类本就该暗的角色 |
| 角色 screen 在深背景上 | 慎用 | 亮部丢失，白衣服变半透；仅适合发光系角色 |
| 角色本体 screen / overlay 混到背景 | 错误 | 发灰、失去固有色，B 模型切片会露出接缝 |
| 面板用 backdrop-filter 让角色透出来 | 越界 | 这是玻璃材质，交给 frontend-liquid-glass |

正确的环境色渗透写法：

```css
/* 只叠一层，不混角色本体 */
.af-char::after {
  content: ""; position: absolute; inset: 0;
  background: var(--af-env-tint, #7BD7F5);
  mix-blend-mode: soft-light;
  opacity: .08;               /* 6-12%，超过 15% 开始染色 */
  pointer-events: none;
}
```

**判据**：关掉这一层，角色固有色几乎不变；如果关掉后像换了个角色，强度过头。

## 4. 抠图边缘：1px 内发光

抠图边缘有两类问题：**白边**（原图背景残留）与**断层**（边缘与背景无交互）。前者要清，后者要补光。

```css
/* drop-shadow 跟随 alpha 通道，不产生矩形；box-shadow 跟随盒子，对抠图无效 */
.af-char__img {
  filter:
    drop-shadow(0 0 calc(var(--af-edge-glow) * 0.02px) var(--af-rim, #FFD9E4))
    drop-shadow(0 0 1px rgba(255, 255, 255, .45));
}
```

- 发光色取**背景主色的提亮版**，不取纯白：白光在冷色背景上像描边贴纸。
- 白边清理优先级：换素材 > 在图像编辑里收 1px alpha > CSS 里用 contrast 硬压（伤整体对比，最后手段）。
- --af-edge-glow 取 60 时半径为 1.2px；取 100 时为 2px，开始出现雾边。

**反例**：给 img 加 1px solid #fff 边框 —— 得到矩形白框，不是角色描边。

## 5. 模型 B 的切片

```html
<div class="af-char" style="--af-cut: 46%">
  <img class="af-char__back"  src="char.png" alt="">
  <img class="af-char__front" src="char.png" alt="">
</div>
```

```css
.af-char { position: absolute; inset: 0; }
.af-char img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: contain; object-position: 50% 0%;
}
.af-char__back  { clip-path: inset(0 0 calc(100% - var(--af-cut)) 0); z-index: 0; }
.af-char__front { clip-path: inset(var(--af-cut) 0 0 0);              z-index: 24; }
```

三条约束：

1. 两片 src 同文件（或同尺寸同裁切副本），object-position 完全一致。
2. 切线上沿落在角色**身体最窄处**（腰或颈），落在手 / 发中间会切出断指。
3. 面板 z=20，前片 z=24 → 前片压面板；后片 z=0 → 面板压后片。这就是「穿透」的全部机制。

**--af-cut 的选择**：在设计稿上找一条水平线，使线上方属于「该被面板挡住」的部分，通常 40–55%。低于 30% 前片几乎没有内容，穿透感消失；高于 65% 面板被切得太碎，文字排不下。

## 6. 前景氛围层的预算

| 指标 | 上限 | 原因 |
| --- | --- | --- |
| 覆盖面积 | 屏面积 12% | 超过就开始干扰阅读 |
| 单个元素高 | 3% 屏高 | 再大就从氛围变成遮挡物 |
| 不透明度 | 0.35 | 超过会盖住面板边缘 |
| 元素数量 | 6（CSS 生成） | 每多一个多一次合成成本 |

用 radial-gradient 或内联 SVG 生成，不用位图、不用 JS 粒子（那是 frontend-particles 的职责）。

## 7. 反例

- 用 z-index: 9999 解决层级：之后每个新元素都要 10000。层号写死，不递增。
- 忘记 isolation：soft-light 层把 body 背景混进来，颜色随滚动变。
- 前景层没写 pointer-events: none：整页按钮点不动，排查半小时。
- 给角色容器加 overflow: hidden 又想用 drop-shadow 外发光：外发光被裁掉，只剩硬边。
- 模型 B 用两张不同裁切的图：窗口一缩放，手就飘到面板外面。
