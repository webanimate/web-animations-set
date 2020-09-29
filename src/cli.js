#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

fs.writeFileSync(path.join(process.cwd(), 'file.js'), `export default {\n\n}\n`)
