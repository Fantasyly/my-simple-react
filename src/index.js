import ReactDom from 'react-dom'
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

const Didact = {
  createElement,
}
/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
)
const container = document.getElementById('root')
ReactDom.render(element, container)
