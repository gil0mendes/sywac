'use strict'

class Api {
  static get (opts) {
    return new Api(opts)
  }

  constructor (opts) {
    this.types = []
    this._factories = {
      context: this.getContext,
      helpBuffer: this.getHelpBuffer,
      boolean: this.getBoolean,
      string: this.getString,
      number: this.getNumber,
      help: this.getHelpType,
      array: this.getArray,
      positional: this.getPositional
    }
    this.configure(opts)
  }

  configure (opts) {
    opts = opts || {}
    // lazily configured instance dependencies (expects a single instance)
    this._unknownType = opts.unknownType || this._unknownType
    this._utils = opts.utils || this._utils

    if ('factories' in opts) {
      Object.keys(opts.factories).forEach(name => this.registerFactory(name, opts.factories[name]))
    }

    // lazily configured factory dependencies (expects a function to call per instance)
    // this._contextFactory = opts.contextFactory || this._contextFactory
    // this._helpBufferFactory = opts.helpBufferFactory || this._helpBufferFactory
    // this._booleanFactory = opts.booleanFactory || this._booleanFactory
    // this._stringFactory = opts.stringFactory || this._stringFactory
    // this._numberFactory = opts.numberFactory || this._numberFactory
    // this._helpTypeFactory = opts.helpTypeFactory || this._helpTypeFactory
    // this._arrayFactory = opts.arrayFactory || this._arrayFactory
    // this._positionalFactory = opts.positionalFactory || this._positionalFactory
    // other
    this._name = opts.name || this._name
    return this
  }

  // lazy dependency accessors
  get unknownType () {
    if (!this._unknownType) this._unknownType = require('./types/unknown').get()
    return this._unknownType
  }

  get utils () {
    if (!this._utils) this._utils = require('./lib/utils').get()
    return this._utils
  }

  get name () {
    if (typeof this._name !== 'string') this._name = require('path').basename(process.argv[1], '.js')
    return this._name
  }

  registerFactory (name, factory) {
    if (name && typeof factory === 'function') this._factories[name] = factory
    return this
  }

  get (name, opts) {
    if (name && this._factories[name]) return this._factories[name].call(this, opts)
    return null
  }

  getContext (opts) {
    return require('./context').get(opts)
  }

  getHelpBuffer (opts) {
    return require('./buffer').get(opts)
  }

  getBoolean (opts) {
    return require('./types/boolean').get(opts)
  }

  getString (opts) {
    return require('./types/string').get(opts)
  }

  getNumber (opts) {
    return require('./types/number').get(opts)
  }

  getHelpType (opts) {
    return require('./types/help').get(opts)
  }

  getArray (opts) {
    return require('./types/array').get(opts)
  }

  getPositional (opts) {
    return require('./types/positional').get(opts)
  }

  // factory wrapper methods
  // newContext (opts) {
  //   if (typeof this._contextFactory !== 'function') this._contextFactory = require('./context').get
  //   return this._contextFactory(opts)
  // }

  // newHelpBuffer (opts) {
  //   if (typeof this._helpBufferFactory !== 'function') this._helpBufferFactory = require('./buffer').get
  //   return this._helpBufferFactory(opts)
  // }

  // newBoolean (opts) {
  //   if (typeof this._booleanFactory !== 'function') this._booleanFactory = require('./types/boolean').get
  //   return this._booleanFactory(opts)
  // }

  // newString (opts) {
  //   if (typeof this._stringFactory !== 'function') this._stringFactory = require('./types/string').get
  //   return this._stringFactory(opts)
  // }

  // newNumber (opts) {
  //   if (typeof this._numberFactory !== 'function') this._numberFactory = require('./types/number').get
  //   return this._numberFactory(opts)
  // }

  // newHelp (opts) {
  //   if (typeof this._helpTypeFactory !== 'function') this._helpTypeFactory = require('./types/help').get
  //   return this._helpTypeFactory(opts)
  // }

  // newArray (opts) {
  //   if (typeof this._arrayFactory !== 'function') this._arrayFactory = require('./types/array').get
  //   return this._arrayFactory(opts)
  // }

  // newPositional (opts) {
  //   if (typeof this._positionalFactory !== 'function') this._positionalFactory = require('./types/positional').get
  //   return this._positionalFactory(opts)
  // }

  // API
  usage (usage) {
    // TODO this!
    return this
  }

  positional (dsl, opts) {
    opts = opts || {}

    if (Array.isArray(dsl)) opts.params = dsl
    else if (typeof dsl === 'object') opts = dsl
    else if (typeof dsl === 'string') {
      // TODO parse dsl string and populate opts.params
    }

    // TODO iterate over opts.params and add positional for each
    // for each param, (1) get elementType via _getType,
    // (2) get positional via this.get('positional', opts),
    // (3) add to unknownType, (4) add to custom/types

    return this
  }

  // configure any arg type
  custom (type) {
    if (type) {
      if (typeof type.validateConfig === 'function') type.validateConfig(this.utils)
      this.types.push(type)
    }
    return this
  }

  _normalizeOpts (flags, opts) {
    opts = opts || {}
    if (Array.isArray(flags)) {
      opts.aliases = flags // treat an array as aliases
    } else if (typeof flags === 'string') {
      opts.flags = flags // treat a string as flags
    } else if (typeof flags === 'object') {
      opts = flags
    }
    return opts
  }

  _addType (flags, opts, name) {
    opts = this._normalizeOpts(flags, opts)

    let typeObject
    name = String(name || opts.type)
    if (name.indexOf(':') !== -1) {
      let types = name.split(':').filter(Boolean)
      if (types[0] === 'array') typeObject = this._getArrayType(flags, opts, types.slice(1).join(':') || 'string')
      else name = types[0]
    }

    // return this.custom(factoryMethod.call(this, opts))
    return this.custom(typeObject || this.get(name, opts))
  }

  _getArrayType (flags, opts, subtypeName) {
    opts = this._normalizeOpts(flags, opts) // TODO this may be redundant

    subtypeName = String(subtypeName || opts.type)
    if (subtypeName.indexOf(':') !== -1) {
      let types = subtypeName.split(':').filter(Boolean)
      if (types[0] === 'array') {
        opts.elementType = this._getArrayType(flags, opts, types.slice(1).join(':') || 'string')
        return this.get('array', opts)
      }
      subtypeName = types[0]
    }

    opts.elementType = this.get(subtypeName, opts)
    return this.get('array', opts)
  }

  // specify 'type' (as string) in opts
  option (flags, opts) {
    return this._addType(flags, opts)
  }

  // common individual value types
  boolean (flags, opts) {
    return this._addType(flags, opts, 'boolean')
  }

  string (flags, opts) {
    return this._addType(flags, opts, 'string')
  }

  number (flags, opts) {
    return this._addType(flags, opts, 'number')
  }

  // specialty types
  help (flags, opts) {
    return this._addType(flags, opts, 'help')
  }

  // multiple value types
  array (flags, opts) {
    return this._addType(flags, opts, 'array')
  }

  /*
  _addArray (flags, opts, subtypeName) {
    opts = opts || {}
    if (!Array.isArray(flags) && typeof flags === 'object') opts = flags

    // subtypeName = String(subtypeName || opts.type)
    // if (subtypeName.indexOf(':') !== -1) {
    //   let types = subtypeName.split(':').filter(Boolean)
    //   if (types[0] === 'array') return this._addArray(flags, opts, types.slice(1).join(':') || 'string')
    // }

    // opts.elementType = subtypeFactoryMethod.call(this, opts)
    opts.elementType = this.get(subtypeName, opts)
    return this.array(flags, opts)
  }
  */

  stringArray (flags, opts) {
    // return this._addArray(flags, opts, 'string')
    return this._addType(flags, opts, 'array:string')
  }

  numberArray (flags, opts) {
    // return this._addArray(flags, opts, 'number')
    return this._addType(flags, opts, 'array:number')
  }

  /*
  _addPositional (opts, subtypeName) {
    opts = opts || {}
    // opts.elementType = this[subtypeFactoryMethodName](opts)
    // opts.elementType = this._factories[subtype].call(this, opts)
    opts.elementType = this.get(subtypeName, opts)
    // let positional = this.newPositional(opts)
    // let positional = this._factories.positional.call(this, opts)
    let positional = this.get('positional', opts)
    if (this.unknownType) this.unknownType.addPositional(positional)
    return this.custom(positional)
  }
  */

  // TODO more types

  // once configured with types, parse and exec asynchronously
  // return a Promise<Result>
  parse (args) {
    let context = this.initContext().slurpArgs(args)

    let parsePromises = this.types.map(type => type.parse(context))

    return Promise.all(parsePromises).then(whenDone => {
      return (this.unknownType && this.unknownType.parse(context)) || Promise.resolve(true)
    }).then(whenDone => {
      // TODO before postParse, determine if any are promptable (and need prompting) and prompt each in series
      let postParse = this.types.map(type => type.postParse(context))
      if (this.unknownType) postParse = postParse.concat(this.unknownType.postParse(context))
      return Promise.all(postParse)
    }).then(whenDone => {
      let types = this.types.map(type => {
        let r = type.toResult()
        type.reset() // TODO instead of holding value within a Type itself, populate Context and reset should be unnecessary
        return r
      })
      if (this.unknownType) {
        types = types.concat(this.unknownType.toResult())
        this.unknownType.reset()
      }
      return context.toResult(types)
    })
  }

  initContext () {
    let context = this.get('context', {
      utils: this.utils,
      helpBuffer: this.get('helpBuffer', { utils: this.utils })
    })
    return context.withTypes(this.types.map(type => type.toObject()))
  }

  // optional convenience methods
  getHelp (opts) {
    return this.initContext().addHelp(opts).output
  }
}

module.exports = Api
