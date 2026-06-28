export type PipelineStage = {
  command: string
  args: string[]
}

export type Redirect = {
  mode: 'overwrite' | 'append'
  path: string
}

export type ParsedPipeline = {
  stages: PipelineStage[]
  redirect: Redirect | null
  inputRedirect: string | null
}

export function parsePipeline(input: string): ParsedPipeline {
  const redirect: Redirect | null = null
  const inputRedirect: string | null = null
  let remaining = input.trim()

  const inputRedirectMatch = remaining.match(/^\s*<\s+(\S+)/)
  let inpRedirect: string | null = null
  if (inputRedirectMatch) {
    inpRedirect = inputRedirectMatch[1]
    remaining = remaining.slice(inputRedirectMatch[0].length).trim()
  }

  const appendMatch = remaining.match(/\s*>>\s+(\S+)\s*$/)
  let outRedirect: Redirect | null = null
  if (appendMatch) {
    outRedirect = { mode: 'append', path: appendMatch[1] }
    remaining = remaining.slice(0, appendMatch.index).trim()
  } else {
    const overwriteMatch = remaining.match(/\s*>\s+(\S+)\s*$/)
    if (overwriteMatch) {
      outRedirect = { mode: 'overwrite', path: overwriteMatch[1] }
      remaining = remaining.slice(0, overwriteMatch.index).trim()
    }
  }

  const stageStrings = remaining.split(/\s*\|\s*/)

  const stages: PipelineStage[] = stageStrings.map((s) => {
    const parts = s.trim().split(/\s+/)
    return {
      command: parts[0] || '',
      args: parts.slice(1),
    }
  }).filter((s) => s.command !== '')

  return {
    stages,
    redirect: outRedirect,
    inputRedirect: inpRedirect,
  }
}
