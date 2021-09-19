import { TEXT_ELEMENT } from './constant'

// 模仿React.createElement
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // React源码中并没有这一步操作
      // 我们这样做只是为了简化我们的代码
      // 当children是一个字符串或者数字的时候，创建一个TEXT_ELEMENT（React中没有）
      children:
        typeof children === 'object'
          ? children
          : createTextElement(children),
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

function render(element, container) {
  // 特殊处理一下我们之前定义的TEXT_ELEMENT
  const dom =
    element.type === TEXT_ELEMENT
      ? document.createTextNode(element.props.nodeValue)
      : document.createElement(element)

  // 把属性添加到节点上
  const isProperty = key => key !== 'children' // 过滤掉children
  Object.keys(element)
    .filter(isProperty)
    .forEach(name => (dom[name] = element.props[name]))

  // 递归处理子节点
  element.props.children.forEach(item => {
    render(item, dom)
  })

  // 添加到dom上
  container.appendChild(dom)
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
