---
title: 虚拟列表
date: 2025-01-25T17:04:14Z
slug: virtual-list
author: aurora-light：https://github.com/auroralight
tags: ['blog', 'coder']
---

## 虚拟列表

主要是参考对应的react-window的实现思路，写一下这个对应源码的实现思路

## 组件的参数设计

```ts
type DynamicRowHeight = {
 getAverageHeight(): number; //根据已经存储的元素高度来计算平均高度
 getHeight(index: number): number; //根据索引获取元素高度
 setHeight(index: number, height: number): void; //设置元素高度
 observeElement(element: HTMLElement): void; //观察元素高度,用于动态计算元素的高度，适用于动态高度的项
};
interface ListProps {
 defaultHeight: number; //默认高度
 listRef?: Ref<{
  get Element(): HTMLElement | null;
 }>; //暴露给外部的ref
 rowCount: number; //行数
 overscanCount?: number; //预渲染行数
 rowHeight?: number | DynamicRowHeight; //项的高度,如果是动态的这个会是一个对象
 itemProps?: Record<string, any>; //项的属性
 rowComponent: React.FC; //list item的组件,主要用于动态渲染组件
 rowProps?: Record<string, any>; //list item的属性
}
```

如上是虚拟列表的list参数设计

## 代码结构

```markdown
|-hooks
|--userVirtualizer.ts //这是实现虚拟列表的核心hook，主要用于计算需要展示和渲染的元素index
|--useCachedBounds.ts //这里主要用于存储每个元素的offset信息，包括{scrollTop,height}
|--useItemSize.ts //这里主要用于传入的元素的转换，如果传入%需要转换成像素值
|--useResizeObserver.ts //这里主要用于监听元素的container元素的变化，用于动态获取container元素高度
|-list.ts //这里是核心逻辑，主要用于渲染list item，串联逻辑
|-utils
|-- getStartStopIndices.ts //这里主要用于计算需要展示和渲染的元素index,核心逻辑
```

有一些非核心的部分，这里就没有展示出来，比如一些工具函数等。

## list组件实现设计

### 实现思路

1.有一个dynamicRowHeight对象,用于存储已经计算好的元素高度2.有一个cachedBounds对象，用于存储每个元素的offset信息，包括{scrollTop,height},并返回对应的获取每个元素的索引.参数类型开头有

```ts
  const map = new Map<number,number>()
 getHeight(index: number): number {
  return map.get(index) || 0
 }
 setHeight(index: number, height: number): void {
  map.set(index, height)
 }
 const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
  const { height } = entry.contentRect;
 //这个里后续会根据元素的一个dataset属性获取index
 const index = getIndex(entry.target as number)
 if(index !== undefined)  map.set(index, height);
  })
 });
 observeElement(element: HTMLElement): void {
 resizeObserver.observe(element)
return () => {
 resizeObserver.disconnect()
}
  //观察元素高度,用于动态计算元素的高度，适用于动态高度的项
 }

```

2.然后有一个cachedBounds对象，用于存储每个元素的offset信息，包括{scrollTop,height},并返回对应的获取每个元素的索引.参数类型开头有cachedBounds

```tsx
  type CacheBounds ={
  getIndex(index: number): number | undefined;
  //根据索引获取元素的scrollTop
  setIndex(index: number, scrollTop: number, height: number): void;
  itemsSize: number|((index:number)=>number);
  //设置元素的scrollTop,height
 }
   export const cachedBounds = new Map<number,{scrollTop:number,height:number}>()
   getIndex(index: number): number | undefined {
     if(cachedBounds.has(index)) return cachedBounds.get(index)?.scrollTop
   while(cachedBounds.size >= index-1) {
    let height = 0;
    switch(typeof itemSize){
    case 'number':
     height = itemSize
     break;
    case 'function':
     height = itemSize(index)
     break;
    default:
     height = 0
     break;
  }
  cachedBounds.set(index, {scrollTop,height})
   }
  return cachedBounds.get(index)?.scrollTop || 0
   }
  setIndex(index: number, scrollTop: number): void {
   while(cachedBounds.size >= index-1) {
    const height = cachedBounds.get(index)?.height || 0
  const previousTop = cachedBounds.get(index)?.scrollTop || 0
 const previousHeight = cachedBounds.get(index)?.height || 0
    cachedBounds.set(index, {scrollTop:previousTop+previousHeight,height})
   }

   }

```

实现思路大致就是根据索引获取元素的scrollTop,height,并根据索引设置元素的scrollTop,height.如果元素的scrollTop,height不存在,则根据itemSize计算元素的高度,并存储到cachedBounds中，itemSize如果没有渲染出来会调用getAverageHeight()方法来计算已有元素的平均高度，并返回平均高度.

3.useVirtualizer hook实现
这个是核心的hook，会返回对应的起始坐标和结束坐标，用于计算需要展示和渲染的元素index.

```ts
const useVirtualizer = (props: ListProps) => {
 const {
  defaultHeight,
  rowCount,
  overscanCount,
  rowHeight,
  itemProps,
  rowComponent,
  rowProps
 } = props;
 // 利用resizeObserver监听container元素的变化，用于动态获取container元素高度
 const { height = defaultContainerSize, width = defaultContainerSize } =
  useResizeObserver({
   defaultHeight: defaultContainerSize,
   defaultWidth: defaultContainerSize,
   element: containerElement,
   style: containerStyle
  });
 //这里会利用cachedBounds对象来存储每个元素的offset信息，包括{scrollTop,height},并返回对应的获取每个元素的索引.参数类型开头有cachedBounds
 const cachedBounds = useCachedBounds({
  itemCount,
  itemProps,
  itemSize
 });
 const getCellBounds = useCallback(
  (index: number) => cachedBounds.get(index),
  [cachedBounds]
 );
 //这里是最关键的逻辑，会根据container元素的滚动位置，计算需要展示和渲染的元素index
 //overscanCount是预渲染的元素数量，用于避免滚动时元素的闪烁
 const [indices, setIndices] = useState<{
  startIndexVisible: number;
  stopIndexVisible: number;
  startIndexOverscan: number;
  stopIndexOverscan: number;
 }>(() =>
  getStartStopIndicesUtil({
   cachedBounds,
   containerScrollOffset: 0,
   containerSize,
   itemCount,
   overscanCount
  })
 );
 //监听container元素的滚动事件，用于更新需要展示和渲染的元素index
 useEffect(() => {
  if (!containerElement) return;
  const onScroll = () => {
   setIndices((prev) => {
    const { scrollTop } = containerElement;
    const next = getStartStopIndicesUtil({
     cachedBounds,
     containerScrollOffset: scrollTop,
     containerSize,
     itemCount,
     overscanCount
    });
    if (shallowCompare(next, prev)) {
     return prev;
    }
    return next;
   });
  };
  containerElement.addEventListener('scroll', onScroll);
  return () => containerElement.removeEventListener('scroll', onScroll);
 }, [containerElement, cachedBounds, itemCount, overscanCount]);
};
```

4.getStartStopIndicesUtil方法 ,这个是计算index的关键

-传入参数
其中cachedBounds是缓存的元素offset信息，containerScrollOffset是当前container元素的滚动位置，containerSize是container元素的高度，itemCount是元素数量，overscanCount是预渲染的元素数量.

```ts
{
 (cachedBounds,
  containerScrollOffset,
  containerSize,
  itemCount,
  overscanCount);
}
```

核心的实现逻辑

```ts
//temp 用于存储当前元素的索引
currentIndex = 0;
startIndexVisible = 0;

stopIndexVisible = 0;

startIndexOverscan = 0;

stopIndexOverscan = 0;

let maxIndex = itemCount - 1;

while (currentIndex < maxIndex) {
 const bounds = cachedBounds.get(currentIndex);
 if (bounds.scrollOffset + bounds.size < containerScrollOffset) {
  currentIndex++;
 }
}
let startIndexVisible = currentIndex;

let stopIndexVisible = currentIndex;

while (currentIndex < maxIndex) {
 const bounds = cachedBounds.get(currentIndex);
 if (
  bounds.scrollOffset + bounds.size <
  containerScrollOffset + containerSize
 ) {
  currentIndex++;
 }
}
stopIndexVisible = currentIndex;
return {
 startIndexVisible,
 stopIndexVisible,
 startIndexOverscan,
 stopIndexOverscan
};
```

最主要的是根据container元素的滚动位置，计算需要展示和渲染的元素index，后续会根据这个对应的坐标进行渲染

5.list的渲染逻辑
-- 使用imperativeHandle来转发内部的element

```ts
   useImperativeHanlde(ref,()=>({
     get Element :()=>containerElement,
   }))
```

--设置元素坐标，进行data属性的坐标标记,并且对元素进行监听

```ts
useEffect(() => {
 const rows = Array.from(element.children).filter((child) => {
  if (child.hasAttribute('aira-hidden')) {
   return false;
  }
  item.setAttribute('data-index', child.index);
  return true;
 });
 if (isDynamicRowHeight) return rowHeightProps.observerElements(rows);
}, [element]);
```

--设置element children元素内容

```ts
    const sizingELment = (
      <div
      ref={sizingRef}
       style={{
        height:getEstimatedSize(),
        width:"100%",
        ariaHidden:true,
        position:"absolute",
        top:0,
        left:0,
       }}
      />
    )

```

-- 创建账具体的元素，

```ts
    tagName: keyof React.JSXIntrisincElement;
    createElement(tagName,{
       role:'list',
       ref:setElement,
       style:{

       }
    },
    rows,
    children,
    sizingElement
    )
```
