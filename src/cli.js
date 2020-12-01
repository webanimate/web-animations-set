#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const execa = require('execa')

const onResponse = (response) => {
  console.log(response)
  // console.log(response.stdout)
}

const onError = (error) => {
  console.log(error)
  console.log(error.stdout)
}

fs.writeFileSync(path.join(process.cwd(), 'file.js'), `export default {\n\n}\n`)

execa(path.join('.', 'node_modules', '.bin', 'eslint') + ' --fix "**/*.*" --resolve-plugins-relative-to . --ignore-path ' + path.join('.', 'node_modules', 'web-animations-set', 'src',  '.eslintignore') + ' --config ' + path.join('.', 'node_modules', 'web-animations-set', 'src', '.eslintrc.json')).then(
  (response) => {
    onResponse(response)
    execa(path.join('.', 'node_modules', '.bin', 'prettier') + ' --write "**/*.*" -u --print-width 280 --no-semi --single-quote --ignore-path ' + path.join('.', 'node_modules', 'web-animations-set', 'src', '.prettierignore')).then(
      (response) => {
        onResponse(response)
      },
      (error) => {
        onError(error)
      }
    )
  },
  (error) => {
    onError(error)
  }
)
