import Plugin from '../Plugin'
import dragDrop from 'drag-drop'
import Dashboard from './Dashboard'
import { defaultTabIcon } from './icons'

/**
 * Modal Dialog & Dashboard
 */
export default class DashboardUI extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.id = 'DashboardUI'
    this.title = 'Dashboard UI'
    this.type = 'orchestrator'

    // set default options
    const defaultOptions = {
      target: 'body',
      defaultTabIcon: defaultTabIcon(),
      panelSelectorPrefix: 'UppyDashboardContent-panel',
      showProgressDetails: true
    }

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.hideModal = this.hideModal.bind(this)
    this.showModal = this.showModal.bind(this)

    this.addTarget = this.addTarget.bind(this)
    this.actions = this.actions.bind(this)
    this.hideAllPanels = this.hideAllPanels.bind(this)
    this.showPanel = this.showPanel.bind(this)
    this.initEvents = this.initEvents.bind(this)
    this.render = this.render.bind(this)
    this.install = this.install.bind(this)
  }

  addTarget (plugin) {
    const callerPluginId = plugin.constructor.name
    const callerPluginName = plugin.title || callerPluginId
    const callerPluginIcon = plugin.icon || this.opts.defaultTabIcon
    const callerPluginType = plugin.type

    if (callerPluginType !== 'acquirer' &&
        callerPluginType !== 'progressindicator' &&
        callerPluginType !== 'presenter') {
      let msg = 'Error: Modal can only be used by plugins of types: acquirer, progressindicator, presenter'
      this.core.log(msg)
      return
    }

    const target = {
      id: callerPluginId,
      name: callerPluginName,
      icon: callerPluginIcon,
      type: callerPluginType,
      focus: plugin.focus,
      render: plugin.render,
      isHidden: true
    }

    const modal = this.core.getState().modal
    const newTargets = modal.targets.slice()
    newTargets.push(target)

    this.core.setState({
      modal: Object.assign({}, modal, {
        targets: newTargets
      })
    })

    return this.opts.target
  }

  hideAllPanels () {
    const modal = this.core.getState().modal

    const newTargets = modal.targets.map((target) => {
      const isAcquirer = target.type === 'acquirer'
      return Object.assign({}, target, {
        isHidden: isAcquirer
      })
    })

    this.core.setState({modal: Object.assign({}, modal, {
      targets: newTargets
    })})
  }

  showPanel (id) {
    const modal = this.core.getState().modal

    // hide all panels, except the one that matches current id
    const newTargets = modal.targets.map((target) => {
      if (target.type === 'acquirer') {
        if (target.id === id) {
          target.focus()
          return Object.assign({}, target, {
            isHidden: false
          })
        }
        return Object.assign({}, target, {
          isHidden: true
        })
      }
      return target
    })

    this.core.setState({modal: Object.assign({}, modal, {
      targets: newTargets
    })})
  }

  hideModal () {
    const modal = this.core.getState().modal

    this.core.setState({
      modal: Object.assign({}, modal, {
        isHidden: true
      })
    })

    document.body.classList.remove('is-UppyDashboard-open')
  }

  showModal () {
    const modal = this.core.getState().modal

    this.core.setState({
      modal: Object.assign({}, modal, {
        isHidden: false
      })
    })

    // add class to body that sets position fixed
    document.body.classList.add('is-UppyDashboard-open')
    // focus on modal inner block
    document.querySelector('*[tabindex="0"]').focus()
  }

  initEvents () {
    const modal = document.querySelector(`${this.opts.target} .UppyDashboard`)
    // Modal open button
    const showModalTrigger = document.querySelector(this.opts.trigger)
    showModalTrigger.addEventListener('click', this.showModal)

    // Close the Modal on esc key press
    document.body.addEventListener('keyup', (event) => {
      if (event.keyCode === 27) {
        this.hideModal()
      }
    })

    // Close on click outside modal or close buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('js-UppyDashboard-close')) {
        this.hideModal()
      }
    })

    // Drag Drop
    dragDrop(`${this.opts.target} .UppyDashboard`, (files) => {
      this.handleDrop(files)
      this.core.log(files)
    })

    // @TODO Exprimental, work in progress
    // Paste from clipboard
    modal.addEventListener('paste', this.handlePaste.bind(this))
  }

  // @TODO Exprimental, work in progress
  handlePaste (ev) {
    // console.log(ev)
    const files = Array.from(ev.clipboardData.items)
    // console.log(files)
    files.shift()
    files.forEach((file) => {
      const fileBlob = file.getAsFile()
      this.core.emitter.emit('file-add', {
        source: this.id,
        name: file.name,
        type: file.type,
        data: fileBlob
      })
    })
  }

  actions () {
    const bus = this.core.emitter

    bus.on('file-add', () => {
      this.hideAllPanels()
    })

    bus.on('dashboard:file-card', (fileId) => {
      const modal = this.core.getState().modal

      this.core.setState({
        modal: Object.assign({}, modal, {
          showFileCard: fileId || false
        })
      })
    })
  }

  handleDrop (files) {
    this.core.log('All right, someone dropped something...')

    files.forEach((file) => {
      this.core.emitter.emit('file-add', {
        source: this.id,
        name: file.name,
        type: file.type,
        data: file
      })
    })
  }

  render (state) {
    const bus = this.core.emitter
    return Dashboard({
      state: state,
      autoProceed: this.core.opts.autoProceed,
      container: this.opts.target,
      hideModal: this.hideModal,
      panelSelectorPrefix: this.opts.panelSelectorPrefix,
      showProgressDetails: this.opts.showProgressDetails,
      handleInputChange: this.handleInputChange,
      showPanel: this.showPanel,
      hideAllPanels: this.hideAllPanels,
      log: this.core.log
    }, bus)
  }

  install () {
    // Set default state for Modal
    this.core.setState({modal: {
      isHidden: true,
      showFileCard: false,
      targets: []
    }})

    const target = this.opts.target
    const plugin = this
    this.target = this.mount(target, plugin)

    this.initEvents()
    this.actions()
  }
}
