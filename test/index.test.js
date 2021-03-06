import animations from '../src/index'
import { properties, jsToCss } from 'animatable-properties'
import { validate } from 'waapi-timing-properties'
import isPlainObject from 'lodash.isplainobject'

const csstree = require('css-tree-animatable')
const sanitize = require('sanitize-filename')

const keyframesSpecialAttributes = ['offset', 'easing', 'composite']
const keyframesAllowedAttributes = [...keyframesSpecialAttributes, ...properties]
const _categorizedAnimations = []

const checkCategories = (categories) => {
  for (const item in categories) {
    if (categories[item] !== true) {
      if (isPlainObject(categories[item])) {
        const response = checkCategories(categories[item])
        if (response !== true) {
          return `${item} > ${response}`
        }
      } else {
        return `${item}: ${categories[item]}`
      }
    }
  }
  return true
}

const checkAttributesOrder = (attributes) => {
  for (const attribute of keyframesAllowedAttributes) {
    if (attribute === attributes[0]) {
      attributes.shift()
    }
    if (attributes.length === 0) {
      return true
    }
  }
  return false
}

const listCategorizedAnimations = (object) => {
  Object.keys(object).forEach((key) => {
    if (object[key] === true) {
      _categorizedAnimations.push(key)
    } else if (isPlainObject(object[key])) {
      listCategorizedAnimations(object[key])
    }
  })
}

const isAnimationObject = (object) => {
  return (
    isPlainObject(object) &&
    // check if it has `keyframes` array
    Array.isArray(object.keyframes) &&
    // check if it has `options` object
    (Object.prototype.hasOwnProperty.call(object, 'options') ? isPlainObject(object.options) : true) &&
    // check if it has no keys other than `keyframes` and `options`
    Object.keys(object).every((element) => ['keyframes', 'options'].includes(element))
  )
}

const invalidObjectFormat = (key) => {
  describe(`\n\n******************************\n${key} animation\n******************************\n`, () => {
    describe(`Animation object to be of valid format`, () => {
      test(`${key}`, (done) => {
        done.fail('Wrong animation format for ' + key)
      })
    })
  })
}

const removeSpecialAttributes = (keyframe) => {
  keyframesSpecialAttributes.forEach((attribute) => {
    delete keyframe[attribute]
  })
  return keyframe
}

Object.keys(animations).forEach((key) => {
  if (isAnimationObject(animations[key])) {
    describe(`\n\n******************************\n${key} animation\n******************************\n`, () => {
      describe(`Animation name to be valid filename`, () => {
        test(`${key}`, () => {
          expect(sanitize(key)).toEqual(key)
        })
      })
      // Keyframes
      describe(`keyframes`, () => {
        const keyframesOffsets = []
        const keyframesEasings = []
        const keyframesComposites = []
        const animationAttributes = {}
        describe(`to contain only allowed attributes`, () => {
          animations[key].keyframes.forEach((keyframe, index) => {
            const keyframesAttributes = []
            Object.keys(keyframe).forEach((attribute) => {
              keyframesAttributes.push(attribute)
              if (attribute === 'offset' && keyframe[attribute] !== null) {
                keyframesOffsets.push(keyframe[attribute])
              } else if (attribute === 'easing') {
                keyframesEasings.push(keyframe[attribute])
              } else if (attribute === 'composite') {
                keyframesComposites.push(keyframe[attribute])
              } else {
                animationAttributes[attribute] = true
              }
            })
            test(`${index}: ${keyframesAttributes}`, () => {
              expect(keyframesAllowedAttributes).toEqual(expect.arrayContaining(keyframesAttributes))
            })
          })
        })

        describe(`attributes to be in order according to convention`, () => {
          animations[key].keyframes.forEach((keyframe, index) => {
            const keyframesAttributes = []
            Object.keys(keyframe).forEach((attribute) => {
              keyframesAttributes.push(attribute)
            })
            test(`${index}: ${keyframesAttributes}`, () => {
              expect(checkAttributesOrder(keyframesAttributes)).toEqual(true)
            })
          })
        })

        // Validate animatable css properties
        describe(`first and last keyframe to contain all animatable properties used in animation`, () => {
          animations[key].keyframes.forEach((keyframe, index) => {
            keyframe = removeSpecialAttributes(keyframe)
            if ([0, animations[key].keyframes.length - 1].includes(index)) {
              let text = ''
              if (!index) {
                text = 'first'
              } else {
                text = 'last'
              }
              test(`${index}: ${text} keyframe to contain all animatable properties used in animation`, () => {
                expect(Object.keys(keyframe)).toEqual(expect.arrayContaining(Object.keys(animationAttributes)))
              })
            }
          })
        })

        describe(`animatable css properties to have valid values`, () => {
          animations[key].keyframes.forEach((keyframe, index) => {
            keyframe = removeSpecialAttributes(keyframe)
            Object.keys(keyframe).forEach((attribute) => {
              const ast = csstree.parse(`${jsToCss(attribute)}: ${keyframe[attribute]}`, {
                context: 'declaration',
                onParseError: (error) => {
                  test(`${index}: ${attribute}`, () => {
                    expect(`\n${error.name}: ${error.message}\n${error.source}\n`).toEqual('')
                  })
                },
              })

              csstree.walk(ast, {
                visit: 'Declaration',
                enter: function (node) {
                  const error = csstree.lexer.matchDeclaration(node).error
                  let message = ''
                  if (error) {
                    message = `\n${error.rawMessage}\nsyntax: ${error.syntax}\nvalue: ${error.css}\n`
                  }
                  test(`${index}: ${attribute}: ${keyframe[attribute]}`, () => {
                    expect(message).toEqual('')
                  })
                },
              })
            })
          })
        })

        // Offsets
        if (keyframesOffsets.length > 0) {
          describe(`offsets`, () => {
            describe(`to be number between 0 and 1`, () => {
              keyframesOffsets.forEach((value, index) => {
                test(`${index}: ${value}`, () => {
                  expect(value).toEqual(expect.any(Number))
                  expect(value).toBeGreaterThanOrEqual(0)
                  expect(value).toBeLessThanOrEqual(1)
                })
              })
            })
            describe(`to be in ascending order`, () => {
              keyframesOffsets.forEach((value, index) => {
                if (index > 0) {
                  test(`${index}: ${value} >= ${keyframesOffsets[index - 1]}`, () => {
                    expect(value).toBeGreaterThanOrEqual(keyframesOffsets[index - 1])
                  })
                }
              })
            })
          })
        }

        //Easings
        if (keyframesEasings.length > 0) {
          describe(`easings`, () => {
            describe(`to be valid`, () => {
              keyframesEasings.forEach((value, index) => {
                test(`${index}: ${value}`, () => {
                  expect(validate({ easing: value })).toBe(true)
                })
              })
            })
          })
        }

        //Composites
        if (keyframesComposites.length > 0) {
          describe(`composites`, () => {
            describe(`to be valid`, () => {
              keyframesComposites.forEach((value, index) => {
                test(`${index}: ${value}`, () => {
                  expect(validate({ composite: value })).toBe(true)
                })
              })
            })
          })
        }
      })

      // Options
      if (Object.prototype.hasOwnProperty.call(animations[key], 'options')) {
        describe(`options`, () => {
          test(`to contain only valid options`, () => {
            expect(validate(animations[key].options, true, true)).toBe(true)
          })
          const options = []
          Object.keys(animations[key].options).forEach((option) => {
            options.push(option)
          })
          test(`to be in alphabetical order: ${options}`, () => {
            expect(JSON.stringify(options) === JSON.stringify(options.sort())).toBe(true)
          })
        })
      }
    })
  } else if (key === 'categories') {
    if (isPlainObject(animations.categories) && !isAnimationObject(animations.categories)) {
      // Categories
      describe(`\n\n******************************\nCategories\n******************************\n`, () => {
        test(`to be valid categories object`, () => {
          expect(checkCategories(animations.categories)).toBe(true)
        })

        const missingAnimations = []
        const extraAnimations = []
        const _availableAnimations = []

        Object.keys(animations).forEach((animation) => {
          if (animation !== 'categories') {
            _availableAnimations.push(animation)
          }
        })
        listCategorizedAnimations(animations.categories)

        // Remove duplicates
        const availableAnimations = [...new Set(_availableAnimations)]
        const categorizedAnimations = [...new Set(_categorizedAnimations)]

        availableAnimations.forEach((animation) => {
          if (!categorizedAnimations.includes(animation)) {
            missingAnimations.push(animation)
          }
        })

        categorizedAnimations.forEach((animation) => {
          if (!availableAnimations.includes(animation)) {
            extraAnimations.push(animation)
          }
        })

        test(`to contain all available animations`, (done) => {
          if (missingAnimations.length > 0) {
            done.fail(
              '\x1b[32mMissing animations detected\x1b[0m: \x1b[31m' +
                missingAnimations +
                '\x1b[0m. \x1b[32mEither include all available animations in your categories object or drop the categories object completely\x1b[0m.'
            )
          } else {
            done()
          }
        })

        test(`to contain only available animations`, (done) => {
          if (extraAnimations.length > 0) {
            done.fail(
              '\x1b[32mNon-listed animations detected\x1b[0m: \x1b[31m' +
                extraAnimations +
                '\x1b[0m. \x1b[32mEither include only available animations in your categories object or drop the categories object completely\x1b[0m.'
            )
          } else {
            done()
          }
        })
      })
    } else {
      invalidObjectFormat('categories')
    }
  } else {
    invalidObjectFormat(key)
  }
})
