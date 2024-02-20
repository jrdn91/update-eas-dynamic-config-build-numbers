import * as core from '@actions/core'
import * as fs from 'fs'
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import generator from '@babel/generator'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const filePath: string = core.getInput('configPath')
    const updateIos: boolean = core.getInput('updateIos') === 'true'
    const updateAndroid: boolean = core.getInput('updateAndroid') === 'true'
    core.debug(`File path: ${filePath}`)

    if (!updateIos && !updateAndroid) {
      return core.setFailed('At least one platform must be selected')
    }

    // Read the file content
    const code = fs.readFileSync(filePath, 'utf-8')

    core.debug(`Read the file`)

    // Parse the code into an AST (Abstract Syntax Tree)
    const ast = parser.parse(code, {
      sourceType: 'module'
    })

    core.debug(`Created AST from the code`)

    // Update the AST
    traverse(ast, {
      enter(path) {
        // Update ios build number
        if (
          updateIos &&
          path.node.type === 'ObjectProperty' &&
          path.node.key.type === 'Identifier' &&
          path.node.key.name === 'buildNumber' &&
          path.parentPath?.node.type === 'ObjectExpression' &&
          path.parentPath.parentPath?.node.type === 'ObjectProperty' &&
          path.parentPath.parentPath.node.key.type === 'Identifier' &&
          path.parentPath.parentPath.node.key.name === 'ios'
        ) {
          const newBuildNumber =
            // @ts-expect-error: Not sure why TS doesn't understand this here
            (parseFloat(path.node.value.value) + 1).toString()
          // @ts-expect-error: Not sure why TS doesn't understand this here
          path.node.value.value = newBuildNumber

          core.debug(`Updated iOS build number`)
          core.setOutput('newIosBuildNumber', newBuildNumber)
        }

        // Update android version code
        if (
          updateAndroid &&
          path.node.type === 'ObjectProperty' &&
          path.node.key.type === 'Identifier' &&
          path.node.key.name === 'versionCode' &&
          path.parentPath?.node.type === 'ObjectExpression' &&
          path.parentPath.parentPath?.node.type === 'ObjectProperty' &&
          path.parentPath.parentPath.node.key.type === 'Identifier' &&
          path.parentPath.parentPath.node.key.name === 'android'
        ) {
          const newVersionCode =
            // @ts-expect-error: Not sure why TS doesn't understand this here
            (parseFloat(path.node.value.value) + 1).toString()
          // @ts-expect-error: Not sure why TS doesn't understand this here
          path.node.value.value = newVersionCode
          core.debug(`Updated Android version code`)
          core.setOutput('newAndroidVersionCode', newVersionCode)
        }
      }
    })

    // Generate updated code from the modified AST
    const updatedCode = generator(ast).code

    core.debug(`Generated the updated code`)

    // Write the updated code back to the file
    fs.writeFileSync(filePath, updatedCode)

    core.debug(`Wrote the updated code to the file`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
