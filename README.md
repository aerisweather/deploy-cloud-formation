# deploy-cloud-formation

Easily deploy and update CloudFormation templates

## What does it do?

When you pass a template to `deployCloudFormation`:
- It creates a CloudFormation stack, if one doesn't exist
- It executes a ChangeSet against a stack, if the stack already exists
- Waits to resolve until the stack is fully created/updated
- Throws an error if the stack fails to create/update

So nothing too fancy. But it turns out that this is kind of tricky using the AWS SDK alone.

## Install

```
npm install --save-dev @aerisweather/deploy-cloud-formation
```

## Example Usage

```typescript
import deployCloudFormation from '@aerisweather/deploy-cloud-formation';

const template = {
  "Resources": {
      "EC2Instance": {
        "Type": "AWS::EC2::Instance",
        "Properties": {
          // ...
        }
      },
      "InstanceSecurityGroup": {
        "Type": "AWS::EC2::SecurityGroup",
        "Properties": {
          // ...
        }
      }
    }
}

deployCloudFormation({
  region: 'us-east-1',
  template: JSON.stringify(template),
  stackName: 'my-cloudformation-stack'
})
  .then(
    () => console.log(`Done!`),
    (err) => console.error(`Failed to create a CloudFormation stack: ${err.message}`)
  );
```

## Template Utilities

To make writing JSON templates a little nicer, we provide you with some utility functions:

```typescript
import {Join, AccountId, Attr, Ref} from '@aeriweather/deploy-cloud-formation';

const template = {
  Resources: {
    //...
    SomeRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        ManagedPolicyArns: [
          // Reference a policy ARN, using your AWS Account ID
          Join([
            'arn:aws:iam::',
            AccountId(),
          ]),
          
          // Reference a policy ARN, from the same CF template,
          // using `Fn::Att`
          Attr('SomePolicy', 'Arn'),
          
          // Reference a policy ARN, from the same CF template,
          // using `{ Ref }`
          Ref('SomePolicy')
        ]
      }
    }
  }
};
```
