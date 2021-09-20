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

function render(element, container) {
  // 1.根据element的type去创建的dom
  const dom =
    element.type === TEXT_ELEMENT
      ? document.createTextNode(element.props.nodeValue)
      : document.createElement(element.type)

  // 2. 将element上的props中非children属性添加到dom上
  const isProperty = key => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => (dom[name] = element.props[name]))

  // 3. 递归children
  element.props.children.forEach(child =>
    render(child, dom)
  )

  // 4. 将dom挂载到container上
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
