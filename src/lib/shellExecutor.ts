import type { ShellNode, ShellExpr } from './shellAST'
import { executeCommand } from './commands/index'
import type { CommandContext } from './commands/types'

type ShellEnvironment = {
  vars: Record<string, string>
  funcs: Map<string, ShellNode[]>
  exitCode: number
}

export class ShellExecutor {
  private env: ShellEnvironment = {
    vars: { '?': '0' },
    funcs: new Map(),
    exitCode: 0,
  }

  constructor(
    private context: CommandContext,
    initialVars?: Record<string, string>,
    private outputLines: string[] = []
  ) {
    if (initialVars) {
      this.env.vars = { ...initialVars }
    }
  }

  execute(nodes: ShellNode[]): { exitCode: number; output: string[] } {
    for (const node of nodes) {
      const done = this.executeNode(node)
      if (!done) break
    }
    return { exitCode: this.env.exitCode, output: this.outputLines }
  }

  private executeNode(node: ShellNode): boolean {
    switch (node.type) {
      case 'command': {
        const args = node.args.map((a) => this.evalExpr(a))
        const cmdLine = [node.command, ...args].join(' ')
        const result = executeCommand(cmdLine, this.context)
        this.env.exitCode = result.success ? 0 : 1
        if (result.data?.output) {
          this.outputLines.push(result.data.output)
        }
        return true
      }

      case 'seq': {
        for (const cmd of node.commands) {
          const shouldContinue = this.executeNode(cmd)
          if (!shouldContinue) return false
        }
        return true
      }

      case 'and': {
        const leftOk = this.executeNode(node.left)
        if (this.env.exitCode === 0) {
          return this.executeNode(node.right)
        }
        return leftOk
      }

      case 'or': {
        const leftOk = this.executeNode(node.left)
        if (this.env.exitCode !== 0) {
          return this.executeNode(node.right)
        }
        return leftOk
      }

      case 'assignment': {
        const value = this.evalExpr(node.value)
        this.env.vars[node.name] = value
        return true
      }

      case 'if': {
        for (const cond of node.condition) {
          this.executeNode(cond)
        }
        if (this.env.exitCode === 0) {
          for (const n of node.then) this.executeNode(n)
        } else if (node.else) {
          for (const n of node.else) this.executeNode(n)
        }
        return true
      }

      case 'for': {
        for (const item of node.items) {
          this.env.vars[node.var] = item
          for (const n of node.body) this.executeNode(n)
        }
        return true
      }

      case 'while': {
        let running = true
        while (running) {
          for (const cond of node.condition) this.executeNode(cond)
          if (this.env.exitCode !== 0) break
          for (const n of node.body) this.executeNode(n)
        }
        return true
      }

      case 'funcdef': {
        this.env.funcs.set(node.name, node.body)
        return true
      }

      case 'pipeline': {
        let pipedOutput: string[] | undefined
        for (const stage of node.stages) {
          if (stage.type === 'command') {
            const args = stage.args.map((a) => this.evalExpr(a))
            const stageContext: CommandContext = {
              ...this.context,
              pipedInput: pipedOutput,
            }
            const cmdLine = [stage.command, ...args].join(' ')
            const result = executeCommand(cmdLine, stageContext)
            this.env.exitCode = result.success ? 0 : 1
            pipedOutput = result.pipedOutput ?? (result.data?.output ? result.data.output.split('\n') : [])
          }
        }
        return true
      }
    }
    return true
  }

  private evalExpr(expr: ShellExpr): string {
    switch (expr.type) {
      case 'string':
        return expr.value
      case 'var':
        return this.env.vars[expr.name] ?? expr.default ?? ''
      case 'command_sub': {
        const result = executeCommand(expr.command, this.context)
        return result.data?.output ?? ''
      }
      case 'arith':
        return String(this.evalArith(expr.expr))
    }
  }

  private evalArith(expr: string): number {
    try {
      const expanded = expr.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        return this.env.vars[name] ?? '0'
      })
      return Function(`"use strict"; return (${expanded})`)()
    } catch {
      return 0
    }
  }
}
