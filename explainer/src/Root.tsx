import { Composition } from 'remotion'
import { Explainer, TOTAL } from './Video'

export function Root() {
  return <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
}
