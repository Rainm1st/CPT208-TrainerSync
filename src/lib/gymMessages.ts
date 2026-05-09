export interface BiMsg { en: string; zh: string }
export type MsgTab = 'HELP' | 'HOW' | 'HI'

export const GYM_HELP: BiMsg[] = [
  { en: 'How many sets left?', zh: '还有几组？' },
  { en: 'Need a hand?',        zh: '能帮帮我吗？' },
  { en: 'Can you aid me?',     zh: '帮我保护一组？' },
  { en: 'Can I borrow this?',  zh: '能不能借用下？' },
]
export const GYM_HOW: BiMsg[] = [
  { en: "What's that move?",          zh: '这是啥动作？' },
  { en: 'Can I ask something?',       zh: '能请教下吗？' },
  { en: 'Mind sharing your routine?', zh: '求同款。' },
]
export const GYM_HI: BiMsg[] = [
  { en: '👍', zh: '赞' },
  { en: '🐂', zh: '牛' },
  { en: '🌟', zh: '棒' },
  { en: '😄', zh: '乐' },
]

export const GYM_TAB_ICON: Record<MsgTab, string> = { HELP: '🆘', HOW: '🤔', HI: '👋' }
export const GYM_TAB_LABEL: Record<MsgTab, string> = { HELP: '🆘 Help', HOW: '🤔 How', HI: '👋 Hey' }

export function getMsgList(tab: MsgTab): BiMsg[] {
  return tab === 'HELP' ? GYM_HELP : tab === 'HOW' ? GYM_HOW : GYM_HI
}
