#!/usr/bin/env node

/**
 * Note that this is NOT a TypeScript file,
 * because referencing binaries in the package.json
 * which are generated in `prepublish` doesn't work so well.
 */
const Cli = require('admiral-cli');
const deployCloudFormation = require('@aerisweather/deploy-cloud-formation').default;

const params = new Cli()
  .option({
    name: 'templateFile',
    type: 'path',
    description: 'Location of template JSON file',
    shortFlag: '-t',
    longFlag: '--template',
    length: 1,
    required: true
  })
  .option({
    name: 'stackName',
    type: 'string',
    description: 'Name of the CloudFormation stack to deploy',
    shortFlag: '-s',
    longFlag: '--stack',
    length: 1,
    required: true
  })
  .option({
    name: 'region',
    type: 'string',
    description: 'AWS region',
    shortFlag: '-r',
    longFlag: '--region',
    length: 1,
    required: true
  })
  .parse();

deployCloudFormation({
  template: require(params.templateFile),
  stackName: params.stackName,
  region: params.region
})
  .then(() => process.exit(0), err => process.exit(1));