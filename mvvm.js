
class Dep {
    constructor () {
        this.listeners = [];
    }
    addListener (obj) {
        this.listeners.push(obj);
    }
    changeWatch () {
        this.listeners.forEach(listener => {
            listener.sendVal();
        })
    }
}

Dep.target = null;
const dep = new Dep();

// 添加属性监听
class Watcher {
    constructor (data, key, callback) {
        // 每一次实例watcher的时候，均会把当前实例赋值给Dep的target静态属性
        Dep.target = this;
        this.data = data;
        this.key = key;
        this.callback = callback;
        // 每一次实例都会调用该函数
        this.init()
    }
    init () {
        // 获取对应的key值
        this.value = utils.getValue(this.data, this.key);
        Dep.target = null;
        return this.value;
    }
    sendVal () {
        let newVal = this.init(); // 再次触发getter函数,返回新值
        this.callback(newVal)
    }
}

const utils = {
    setValue (node, data, key) {
        node.value = this.getValue(data, key)
    },
    getValue (data, key) {
        // 判断获得的key是否为对象的key值，如:msg.content
        if (key.indexOf('.') !== -1) {
            let arr = key.split('.');
            for (let i = 0; i < arr.length; i++) {
                data = data[arr[i]]
            }
            return data;
        } else {
            return data[key]
        }
    },
    changeInpVal (data, key, value) {
        if (key.indexOf('.') !== -1) {
            let arr = key.split('.');
            for (let i = 0; i < arr.length - 1; i++) {
                data = data[arr[i]]
            }
            data[arr[arr.length - 1]] = value
        } else {
            data[key] = value;
        }
    }
}

// 给属性添加数据劫持
class Observer {
    constructor (data) {
        if (!data || typeof data !== 'object') {
            return;
        }
        this.data = data
        this.init()
    }
    init () {
        Object.keys(this.data).forEach(key => {
            this.observer(this.data, key, this.data[key])
        }) 
    }
    observer (data, key, value) {
        // 通过递归实现每个属性的数据劫持
        new Observer(data[key])
        Object.defineProperty(data, key, {
            get () {                
                if (Dep.target) {
                    dep.addListener(Dep.target)
                }
                return value;
            },
            set (newVal) {
                if (value === newVal) {
                    return;
                }
                value = newVal;
                // 触发每一个listenFunc里面的watcher实例
                dep.changeWatch();
                // 为了兼容新设置的值为对象，给新值添加数据劫持
                new Observer(value);
            }
        })
    }
}

// 实现双向数据绑定
class Mvvm {
    constructor (props) {
        this.el = props.el;
        this.data = props.data;
        this.init()
        // 替换文本中的值为真实的数据
        this.initDom()
    }
    init () {
        // 初始化执行数据绑定当前实例对象的过程以及数据劫持
        Object.keys(this).forEach(key => {
            this.observer(this, key, this[key])
        })
        // 给当前数据集合data的每个属性添加数据劫持
        new Observer(this.data)
    }
    observer (obj, key, val) {
        // Object.defineProperty() 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象。
        Object.defineProperty(obj, key, {
            get () {
                return val
            },
            set (newVal) {
                val = newVal
            }
        })
    }
    initDom () {
        this.$el = document.querySelector(this.el);
        let fragment = this.createFragment();
        this.$el.appendChild(fragment)
    }
    createFragment () {
        // 创建空白文档 --> 碎片流 --> 可以避免浏览器的重绘
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = this.$el.firstChild) {
            fragment.appendChild(firstChild)
        }
        // 根据nodeType渲染真实数据
        this.compiler(fragment);
        return fragment;
    }
    compiler (node) {
        if (node.nodeType === 1) { // 元素节点
            let attrs = Array.from(node.attributes);
            attrs.forEach(attr => {
                // 渲染input的v-model
                if (attr.nodeName === 'v-model') {
                    // 捕捉input的输入事件
                    node.addEventListener('input', (e) => {
                        utils.changeInpVal(this.data, attr.nodeValue, e.target.value)
                    })
                    utils.setValue(node, this.data, attr.nodeValue);
                }
            })
        } else if (node.nodeType === 3) { // 文本节点
            if (node.textContent.indexOf('{{') !== -1) {
                let context = node.textContent.split('{{')[1].split('}}')[0];
                node.textContent = utils.getValue(this.data, context);
                // 添加属性监听
                new Watcher(this.data, context, (newVal) => {
                    node.textContent = newVal;
                })
            }
        }
        // 通过递归形式保证每一级属性都被获取并替换
        node.childNodes.forEach(item => {
            this.compiler(item)
        })
    }
}
