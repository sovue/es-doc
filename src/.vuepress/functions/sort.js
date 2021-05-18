import cloneDeep from 'lodash.clonedeep'

export default (array, key) => {
  const clonedArray = cloneDeep(array)

  clonedArray.sort((current, next) => {
    let textCurrent = current
    let textNext = next

    if (key) {
      textCurrent = textCurrent[key]
      textNext = textNext[key]
    }

    return textCurrent.localeCompare(textNext)
  })

  return clonedArray
}
