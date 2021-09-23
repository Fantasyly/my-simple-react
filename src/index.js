import {
  TEXT_ELEMENT,
  ROOT_FIBER,
  UPDATE,
  PLACEMENT,
  DELETION,
} from './constant'

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
  // const isProperty = key => key !== 'children'
  // Object.keys(fiber.props)
  //   .filter(isProperty)
  //   .forEach(name => (dom[name] = fiber.props[name]))
  updateDom(dom, {}, fiber.props)
  return dom
}

// 将render工作拆分为多个工作单元去循环执行
let nextUnitOfWork = null
let wipRoot = null // wipRoot表示fiber树的根节点
let currentRoot = null // 上次commit的fiber树的根节点 也是当年页面已经展示的树的根节点
let deletions = null // diff时存储要删除的节点
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // 如果没有下一个工作单元了，且wipRoot存在（就是根fiber节点存在）
  // 此时表示整个dom树都构建好了，可以直接append了
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
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

  // 移除appendChild的代码
  // if (fiber.parent) {
  //   // 如果parent节点存在的话 将当前节点挂在parent节点上
  //   fiber.parent.dom.appendChild(fiber.dom)
  // }

  // 2. 对当前fiber节点的children生成fiber树
  reconcileChildren(fiber, fiber.props.children)

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

/**
 * @param {*} wipFiber  parent Fiber
 * @param {*} elements  children
 */
function reconcileChildren(wipFiber, elements) {
  let prevSibling = null

  // 获取oldFiber节点
  let oldFiber =
    wipFiber.alternate && wipFiber.alternate.child
  let index = 0
  while (index < elements.length || oldFiber) {
    const child = elements[index]
    let newFiber = null

    // 新旧fiber树进行diff
    const isSameType =
      oldFiber && child && oldFiber.type === child.type

    if (isSameType) {
      // update node
      newFiber = {
        type: oldFiber.type,
        parent: wipFiber,
        props: child.props,
        dom: oldFiber.dom,
        alternate: oldFiber,
        effectTag: UPDATE,
      }
    }

    if (child && !isSameType) {
      // add new node
      newFiber = {
        type: child.type,
        parent: wipFiber,
        props: child.props,
        dom: null,
        alternate: null,
        effectTag: PLACEMENT,
      }
    }

    if (oldFiber && !isSameType) {
      // delete old node
      deletions.push(oldFiber)
      oldFiber.effectTag = DELETION
    }

    // 更新oldFiber
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      // 链接第一个子节点
      wipFiber.child = newFiber
    } else {
      // 子节点之间使用sibling串联兄弟节点
      prevSibling.sibling = newFiber
    }
    index++
    prevSibling = newFiber
  }
}

function commitRoot() {
  //add nodes to DOM

  // 对deletions中的节点执行commitWork
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)

  // 保存当前这次的fiber树
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) return

  // 将当前节点添加上
  const parentDom = fiber.parent.dom

  // 根据effectTag进行操作

  // PLACEMENT 添加新节点
  if (fiber.effectTag === PLACEMENT && fiber.dom) {
    parentDom.appendChild(fiber.dom)
  } else if (fiber.effectTag === DELETION) {
    // 删除节点
    parentDom.removeChild(fiber.dom)
  } else if (fiber.effectTag === UPDATE && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }

  // parentDom.appendChild(fiber.dom)

  // 递归子节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

const isEvent = key => key.startsWith('on')
const isProperty = key =>
  key !== 'children' && !isEvent(key) // 找出非children的属性
const isNew = (prev, next) => key => prev[key] !== next[key] // 找出prev和next上不一致的属性
const isGone = (prev, next) => key => !(key in next) // 找出不在next上的
function updateDom(dom, prevProps, nextProps) {
  // 移除不用的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => (dom[name] = ''))

  // 移除旧的事件监听
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })
  // 增加新的事件监听
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      console.log(name)
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  const a = Object.keys(nextProps).filter(isEvent)
  console.log(a)

  // 新增属性 新增的 或者 修改的
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => (dom[name] = nextProps[name]))
}

function render(element, container) {
  wipRoot = {
    type: ROOT_FIBER, // 自己定义的一个类型
    parent: null, // 根Fiber没有parent节点
    dom: container, // 真实DOM
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

const Didact = {
  createElement,
  render,
}
// /** @jsx Didact.createElement */
// const element = (
//   <div style="background: salmon">
//     <h1>Hello World</h1>
//     <h2 style="text-align:right">from Didact</h2>
//   </div>
// )
// const container = document.getElementById('root')
// Didact.render(element, container)

/** @jsx Didact.createElement */
const container = document.getElementById('root')

const updateValue = e => {
  console.log(e.target.value)
  rerender(e.target.value)
}

const rerender = value => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  Didact.render(element, container)
}

rerender('World')
