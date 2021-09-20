import { TEXT_ELEMENT, ROOT_FIBER } from './constant'

// 模仿React.createElement
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // React源码中并没有这一步操作
      // 我们这样做只是为了简化我们的代码
      // 当children是一个字符串或者数字的时候，创建一个TEXT_ELEMENT（React中没有）
      children: children.map(child =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(value) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: value,
      children: [],
    },
  }
}

function createDom(fiber) {
  // 1.根据element的type去创建的dom
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode(fiber.props.nodeValue)
      : document.createElement(fiber.type)

  // 2. 将element上的props中非children属性添加到dom上
  const isProperty = key => key !== 'children'
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => (dom[name] = fiber.props[name]))
  return dom
}

// 将render工作拆分为多个工作单元去循环执行
let nextUnitOfWork = null
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}

// 启动首次调用
requestIdleCallback(workLoop)

// 执行一个工作单元
function performUnitOfWork(fiber) {
  //1. 添加dom节点
  if (!fiber.dom) {
    // 没有dom节点的话 去创建dom节点
    fiber.dom = createDom(fiber)
  }

  if (fiber.parent) {
    // 如果parent节点存在的话 将当前节点挂在parent节点上
    fiber.parent.dom.appendChild(fiber.dom)
  }

  // 2. 对当前fiber节点的children生成fiber树
  let prevSibling = null
  const children = fiber.props.children
  children.forEach((child, index) => {
    const newFiber = {
      type: child.type,
      parent: fiber,
      props: child.props,
      dom: null,
    }

    if (index === 0) {
      // 链接第一个子节点
      fiber.child = newFiber
    } else {
      // 子节点之间使用sibling串联兄弟节点
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
  })

  // 3. return下一个工作单元

  // 有子节点的话 return第一个子节点
  if (fiber.child) {
    return fiber.child
  }

  // 没有子节点 寻找兄弟节点
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function render(element, container) {
  nextUnitOfWork = {
    type: ROOT_FIBER, // 自己定义的一个类型
    parent: null, // 根Fiber没有parent节点
    dom: container, // 真实DOM
    props: {
      children: [element],
    },
  }
}

const Didact = {
  createElement,
  render,
}
/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
)
const container = document.getElementById('root')
Didact.render(element, container)
