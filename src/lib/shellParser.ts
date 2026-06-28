import type { ShellNode, ShellExpr } from './shellAST'

export class ShellParser {
  private tokens: string[]
  private pos: number

  constructor(private source: string) {
    this.tokens = this.tokenize(source)
    this.pos = 0
  }

  private tokenize(source: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < source.length) {
      const ch = source[i]
      if (ch === ' ' || ch === '\t' || ch === '\n') {
        i++
        continue
      }
      if (ch === '"') {
        let s = ''
        i++
        while (i < source.length && source[i] !== '"') {
          if (source[i] === '\\') { i++; if (i < source.length) s += source[i++] }
          else s += source[i++]
        }
        if (i < source.length) i++
        tokens.push(s)
        continue
      }
      if (ch === "'") {
        let s = ''
        i++
        while (i < source.length && source[i] !== "'") {
          s += source[i++]
        }
        if (i < source.length) i++
        tokens.push(s)
        continue
      }
      if ('();|&<>;'.includes(ch)) {
        if (ch === '&' && i + 1 < source.length && source[i + 1] === '&') {
          tokens.push('&&')
          i += 2
        } else if (ch === '|' && i + 1 < source.length && source[i + 1] === '|') {
          tokens.push('||')
          i += 2
        } else {
          tokens.push(ch)
        }
        i++
        continue
      }
      let word = ''
      while (i < source.length && !' \t\n()|&<>;'.includes(source[i])) {
        if (source[i] === '\\') { i++; if (i < source.length) word += source[i++] }
        else word += source[i++]
      }
      if (word) tokens.push(word)
    }
    return tokens
  }

  private peek(): string | undefined {
    return this.tokens[this.pos]
  }

  private consume(): string | undefined {
    return this.tokens[this.pos++]
  }

  private expect(expected: string): void {
    const tok = this.consume()
    if (tok !== expected) {
      throw new Error(`Expected '${expected}' but got '${tok}'`)
    }
  }

  parseProgram(): ShellNode[] {
    const nodes: ShellNode[] = []
    while (this.pos < this.tokens.length) {
      nodes.push(this.parseStatement())
    }
    return nodes
  }

  private parseStatement(): ShellNode {
    if (this.peek() === 'if') {
      return this.parseIf()
    }
    if (this.peek() === 'for') {
      return this.parseFor()
    }
    if (this.peek() === 'while') {
      return this.parseWhile()
    }
    if (this.peek() === 'function' || (this.peek() && this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1] === '(' && this.tokens[this.pos + 2] === ')')) {
      return this.parseFuncDef()
    }
    return this.parseSeq()
  }

  private parseExpr(): ShellExpr {
    const tok = this.peek()
    if (!tok) return { type: 'string', value: '' }

    if (tok.startsWith('$(') && tok.endsWith(')')) {
      this.consume()
      return { type: 'command_sub', command: tok.slice(2, -1) }
    }

    if (tok.startsWith('$((') && tok.endsWith('))')) {
      this.consume()
      return { type: 'arith', expr: tok.slice(3, -2) }
    }

    if (tok === '$' && this.pos + 1 < this.tokens.length) {
      this.consume()
      const name = this.consume() || ''
      return { type: 'var', name }
    }

    if (tok.startsWith('$')) {
      this.consume()
      let name = tok.slice(1)
      let defaultVal: string | undefined
      if (name.includes(':-')) {
        const parts = name.split(':-')
        name = parts[0]
        defaultVal = parts.slice(1).join(':-')
      }
      return { type: 'var', name, default: defaultVal }
    }

    this.consume()
    return { type: 'string', value: tok }
  }

  private parseSeq(): ShellNode {
    const left = this.parseAndOr()
    if (this.peek() === ';' || this.peek() === '\n') {
      this.consume()
      const rest = this.parseProgram()
      if (rest.length === 0) return left
      return { type: 'seq', commands: [left, ...rest] }
    }
    return left
  }

  private parseAndOr(): ShellNode {
    let left = this.parsePipeline()
    while (this.peek() === '&&' || this.peek() === '||') {
      const op = this.consume()
      const right = this.parsePipeline()
      left = op === '&&'
        ? { type: 'and', left, right }
        : { type: 'or', left, right }
    }
    return left
  }

  private parsePipeline(): ShellNode {
    let left = this.parseCommand()
    while (this.peek() === '|') {
      this.consume()
      const right = this.parseCommand()
      left = { type: 'pipeline', stages: [
        ...(left.type === 'pipeline' ? left.stages : [left]),
        ...(right.type === 'pipeline' ? right.stages : [right]),
      ]}
    }
    return left
  }

  private parseCommand(): ShellNode {
    const tok = this.peek()
    if (!tok) return { type: 'command', command: '', args: [] }

    if (tok === '(') {
      this.consume()
      const nodes = this.parseProgram()
      this.expect(')')
      return { type: 'seq', commands: nodes }
    }

    if (tok.includes('=') && !tok.startsWith('-') && this.pos + 1 < this.tokens.length) {
      const eqIdx = tok.indexOf('=')
      if (eqIdx > 0 && eqIdx < tok.length - 1) {
        this.consume()
        const eqIdx2 = tok.indexOf('=')
        const name = tok.slice(0, eqIdx2)
        const value = tok.slice(eqIdx2 + 1)
        return { type: 'assignment', name, value: { type: 'string', value } }
      }
    }

    const cmd = this.consume() || ''
    const args: ShellExpr[] = []
    while (this.peek() && !'|&;()'.includes(this.peek() || '') && this.peek() !== '>' && this.peek() !== '<') {
      if (this.peek() === '&&' || this.peek() === '||') break
      args.push(this.parseExpr())
    }
    return { type: 'command', command: cmd, args }
  }

  private parseIf(): ShellNode {
    this.expect('if')
    const condition: ShellNode[] = []
    while (this.peek() && this.peek() !== 'then') {
      condition.push(this.parseStatement())
    }
    this.expect('then')
    const then: ShellNode[] = []
    while (this.peek() && this.peek() !== 'else' && this.peek() !== 'elif' && this.peek() !== 'fi') {
      then.push(this.parseStatement())
    }
    let else_: ShellNode[] | undefined
    if (this.peek() === 'else') {
      this.consume()
      else_ = []
      while (this.peek() && this.peek() !== 'fi') {
        else_.push(this.parseStatement())
      }
    }
    this.expect('fi')
    return { type: 'if', condition, then, else: else_ }
  }

  private parseFor(): ShellNode {
    this.expect('for')
    const varName = this.consume() || ''
    this.expect('in')
    const items: string[] = []
    while (this.peek() && this.peek() !== ';' && this.peek() !== '\n') {
      const item = this.consume()
      if (item) items.push(item)
    }
    if (this.peek() === ';' || this.peek() === '\n') this.consume()
    this.expect('do')
    const body: ShellNode[] = []
    while (this.peek() && this.peek() !== 'done') {
      body.push(this.parseStatement())
    }
    this.expect('done')
    return { type: 'for', var: varName, items, body }
  }

  private parseWhile(): ShellNode {
    this.expect('while')
    const condition: ShellNode[] = []
    while (this.peek() && this.peek() !== ';' && this.peek() !== '\n' && this.peek() !== 'do') {
      condition.push(this.parseStatement())
    }
    if (this.peek() === ';' || this.peek() === '\n') this.consume()
    this.expect('do')
    const body: ShellNode[] = []
    while (this.peek() && this.peek() !== 'done') {
      body.push(this.parseStatement())
    }
    this.expect('done')
    return { type: 'while', condition, body }
  }

  private parseFuncDef(): ShellNode {
    let name: string
    if (this.peek() === 'function') {
      this.consume()
      name = this.consume() || ''
    } else {
      name = this.consume() || ''
    }
    this.expect('(')
    this.expect(')')
    this.expect('{')
    const body: ShellNode[] = []
    while (this.peek() && this.peek() !== '}') {
      body.push(this.parseStatement())
    }
    this.expect('}')
    return { type: 'funcdef', name, body }
  }
}
