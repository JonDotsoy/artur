const symbolToParams = new WeakMap<
  GroupName<any>,
  { name: string; expPath: string }
>();
const urlParamsMap = new WeakMap<
  { toString(): string },
  Record<string, string>
>();

export class URLPathPattern<T> {
  constructor(
    readonly template: TemplateStringsArray,
    readonly sustitutions: GroupName<T>[],
  ) {}

  toRegexp() {
    return new RegExp(
      `^${String.raw(
        { raw: this.template.map((e) => e.replace(/\W/g, (e) => `\\${e}`)) },
        ...this.sustitutions.map((e) => symbolToParams.get(e)!.expPath),
      )}$`,
      "i",
    );
  }

  test(url: Request | { toString(): string }) {
    const u = new URL(url instanceof Request ? url.url : url.toString());
    const exp = this.toRegexp().exec(u.pathname);
    if (!exp) return false;
    urlParamsMap.set(url, exp.groups!);
    return true;
  }

  static of<T extends string = string>(pattern: string) {
    const template: string[] = [];
    const sustitutions: GroupName<T>[] = [];
    const exp = /((?<group>\:(?<group_name>\w+))|(?<wildcard>\*))/g;
    let match: RegExpExecArray | null;
    let startOfNextTemplate = 0;
    while ((match = exp.exec(pattern))) {
      template.push(pattern.substring(startOfNextTemplate, match.index));
      startOfNextTemplate = match.index + match[0].length;
      if (match?.groups?.group_name) {
        sustitutions.push(urlPathPattern.group<any>(match.groups.group_name));
      }
      if (match?.groups?.wildcard) {
        sustitutions.push(urlPathPattern.wildcard() as any);
      }
    }
    template.push(pattern.substring(startOfNextTemplate));
    const e = [...template] as unknown as TemplateStringsArray;
    Reflect.set(e, "raw", e);

    return urlPathPattern(
      e as unknown as TemplateStringsArray,
      ...sustitutions,
    );
  }
}

export class GroupName<T> {
  constructor(readonly name: T) {}
}

export const urlPathPattern = <T>(
  template: TemplateStringsArray,
  ...sustitutions: GroupName<T>[]
) => new URLPathPattern(template, sustitutions);

urlPathPattern.group = <T extends string>(propName: T) => {
  if (/\W/.test(propName)) throw new Error(`Invalid prop name ${propName}`);

  const groupName = new GroupName(propName);

  symbolToParams.set(groupName, {
    name: propName,
    expPath: `(?<${propName}>[^\\/]+)`,
  });

  return groupName;
};

urlPathPattern.wildcard = () => {
  const propName = "wildcard" as const;

  const groupName = new GroupName(propName);

  symbolToParams.set(groupName, {
    name: propName,
    expPath: `(?<${propName}>.+)`,
  });

  return groupName;
};

urlPathPattern.params = (url: Request | { toString(): string }) => {
  return urlParamsMap.get(url);
};
