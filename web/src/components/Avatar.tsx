type Props = { name: string; isSelf?: boolean }

export function Avatar({ name, isSelf }: Props) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const hue = isSelf ? 250 : (name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360)
  return (
    <div
      className="avatar"
      style={{ background: `hsl(${hue}, 55%, 45%)` }}
      title={name}
    >
      {initials || '?'}
    </div>
  )
}
