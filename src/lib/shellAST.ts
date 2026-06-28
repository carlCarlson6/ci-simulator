export type ShellExpr =
  | { type: 'string'; value: string }
  | { type: 'var'; name: string; default?: string }
  | { type: 'command_sub'; command: string }
  | { type: 'arith'; expr: string }

export type ShellNode =
  | { type: 'command'; command: string; args: ShellExpr[] }
  | { type: 'pipeline'; stages: ShellNode[]; redirect?: { mode: 'overwrite' | 'append'; path: string } }
  | { type: 'if'; condition: ShellNode[]; then: ShellNode[]; else?: ShellNode[] }
  | { type: 'for'; var: string; items: string[]; body: ShellNode[] }
  | { type: 'while'; condition: ShellNode[]; body: ShellNode[] }
  | { type: 'funcdef'; name: string; body: ShellNode[] }
  | { type: 'seq'; commands: ShellNode[] }
  | { type: 'and'; left: ShellNode; right: ShellNode }
  | { type: 'or'; left: ShellNode; right: ShellNode }
  | { type: 'assignment'; name: string; value: ShellExpr }
