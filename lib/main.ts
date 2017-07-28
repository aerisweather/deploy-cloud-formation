import {CloudFormation} from 'aws-sdk';
import * as _ from 'lodash';
import poll from './Util/poll';

async function deployCloudFormation(opts:{
  template: string;
  stackName: string;
  region: string;
}) {
  const cf = new CloudFormation({ region: opts.region });


  console.log('Validating template...');
  await cf
    .validateTemplate({ TemplateBody: opts.template })
    .promise();
  console.log('Validating template... done!');


  const doesStackExist = await stackExists(opts.stackName);

  // Stack doesn't exist --> create it
  if (!doesStackExist) {
    await createStack({
      stackName: opts.stackName,
      template: opts.template,
      region: opts.region
    });
    return;
  }

  // Stack exists --> create & execute a change set
  const changeSet = await createChangeSet({
    region: opts.region,
    stackName: opts.stackName,
    template: opts.template
  });

  if (!changeSet.Changes.length) {
    console.log(`Change set contains no changes to existing CloudFormation stack. Nothing else to do here.`);
    return;
  }

  // Execute the change set
  await executeChangeSet({
    region: opts.region,
    stackName: opts.stackName,
    changeSetName: changeSet.ChangeSetName
  });



}
export default deployCloudFormation;


export async function createStack(opts: {
  stackName: string;
  template: string;
  region: string;
}) {
  const cf = new CloudFormation({ region: opts.region });

  console.log(`Creating stack "${opts.stackName}"....`);
  await cf.createStack({
    StackName: opts.stackName,
    TemplateBody: opts.template,
    Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM']
  }).promise();
  console.log(`Creating stack.... initialized...`);

  await cf.waitFor('stackCreateComplete', {
    StackName: opts.stackName
  }).promise();
  console.log(`Creating stack.... done!`);
}

export async function createChangeSet(opts: {
  region: string;
  stackName: string;
  changeSetName?: string;
  template: string;
}):Promise<CloudFormation.DescribeChangeSetOutput> {
  const cf = new CloudFormation({ region: opts.region });
  const changeSetName = opts.changeSetName || `generated-${Date.now()}`;

  console.log(`Creating changeSet "${changeSetName}"...`);
  await cf.createChangeSet({
    ChangeSetName: changeSetName,
    StackName: opts.stackName,
    Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'],
    TemplateBody: opts.template,
    ChangeSetType: 'UPDATE'
  }).promise();
  console.log(`Creating changeSet... initialized...`);

  // Wait for the changeSet to be completed
  const changeSetRes = await poll(
    () => cf.describeChangeSet({
      StackName: opts.stackName,
      ChangeSetName: changeSetName
    }).promise(),
    (res:any) => _.includes(['FAILED', 'CREATE_COMPLETE'], res.Status),
    { timeout: 1000 * 60 * 5, interval: 1000 * 2 }
  );

  if (changeSetRes.Changes.length && changeSetRes.Status === 'FAILED') {
    throw new Error(`Failed to create changeSet "${changeSetName}": ${changeSetRes.StatusReason}`);
  }

  return changeSetRes;
}

export async function executeChangeSet(opts: {
  region: string;
  stackName: string;
  changeSetName: string;
}) {
  const cf = new CloudFormation({ region: opts.region });

  // Execute change set
  console.log(`Executing change set: ${opts.changeSetName}...`);
  await cf.executeChangeSet({
    StackName: opts.stackName,
    ChangeSetName: opts.changeSetName
  }).promise();
  console.log(`Executing change set: ${opts.changeSetName}... initialized...`);

  // CF doesn't provide an UPDATE_FAILED event,
  // so instead we'll wait to see if we get a UPDATE_ROLLBACK_IN_PROGRESS
  // (means that the update failed, and is attempting to roll-back)
  const stackDescr = await poll(
    () => cf.describeStacks({ StackName: opts.stackName }).promise(),
    (res) => _.includes(['UPDATE_COMPLETE', 'UPDATE_ROLLBACK_IN_PROGRESS'], res.Stacks[0].StackStatus),
    { timeout: 1000 * 60 * 5, interval: 1000 * 2 }
  );
  if (stackDescr.Stacks[0].StackStatus === 'UPDATE_ROLLBACK_IN_PROGRESS') {
    throw new Error(`Stack update failed: ${stackDescr.Stacks[0].StackStatusReason}`);
  }
  console.log(`Executing change set: ${opts.changeSetName}... done!`);
}

export async function stackExists(stackName: string) {
  const cf = new CloudFormation({ region: 'us-east-1' });
  try {
    await cf.describeStacks({
      StackName: stackName
    }).promise();
    return true;
  }
  catch (err) {
    if (err.code === 'ValidationError') {
      return false;
    }
    throw err;
  }
}

export * from './Template';