export function Join(strs: string[] | any[], delimiter:string = ''):any {
  return {
    'Fn::Join': [delimiter, strs]
  };
}

export function AccountId() {
  return Ref('AWS::AccountId');
}

export function Attr(resource:string, attr:string):any {
  return {
    'Fn::GetAtt': [
      resource,
      attr
    ]
  }
}

export function Ref(ref:string) {
  return { Ref: ref };
}