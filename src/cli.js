#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const execa = require('execa')
const testFiles = ['babel.config.js', 'index.test.js', 'jest.config.js']

const copyTestFiles = () => {
  testFiles.forEach((file) => {
    fs.copyFileSync(path.join('.', 'node_modules', 'web-animations-set', 'src', file), file)
  })
}

const removeTestFiles = () => {
  testFiles.forEach((file) => {
    fs.rmSync(file)
  })
}

const onError = () => {}

execa(
  path.join('.', 'node_modules', '.bin', 'eslint') +
  ' --fix "**/*.*" --resolve-plugins-relative-to . --ignore-path ' +
  path.join('.', 'node_modules', 'web-animations-set', 'src', '.eslintignore') +
  ' --config ' +
  path.join('.', 'node_modules', 'web-animations-set', 'src', '.eslintrc.json'),
  { stdio: 'inherit' }
).then(
  () => {
    execa(
      path.join('.', 'node_modules', '.bin', 'prettier') +
      ' --write "**/*.*" -u --print-width 280 --no-semi --single-quote --ignore-path ' +
      path.join('.', 'node_modules', 'web-animations-set', 'src', '.prettierignore'),
      { stdio: 'inherit' }
    ).then(
      () => {
        copyTestFiles()
        execa(path.join('.', 'node_modules', '.bin', 'jest'), { stdio: 'inherit' }).then(
          () => {
            removeTestFiles()
          },
          () => {
            removeTestFiles()
          }
        )
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
