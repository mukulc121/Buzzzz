import type { ImageSourcePropType } from "react-native";
import { Presets } from "react-native-pulsar";

export interface IPresetConfig {
  name: string;
  description: string;
  tags: string[];
  duration: number;
  image: ImageSourcePropType;
  play: () => void;
}

export const PresetsConfig: IPresetConfig[] = [
  {
    name: "Afterglow",
    description:
      "A three-beat phrase that dissolves gently, ideal for soft endings or gradually quieting feedback.",
    tags: ["Bold", "Soft", "Impulses", "Short"],
    duration: 150,
    image: require("../../../assets/presets/Afterglow.png"),
    play: Presets.afterglow,
  },
  {
    name: "Aftershock",
    description:
      "A firm opening that settles calmly, ideal for transitions needing a strong start and a gentle finish.",
    tags: ["Substantial", "Flexible", "Impulses", "Extended"],
    duration: 500,
    image: require("../../../assets/presets/Aftershock.png"),
    play: Presets.aftershock,
  },
  {
    name: "Alarm",
    description:
      "Relentless and urgent, best for critical errors or emergencies that require immediate attention.",
    tags: ["Bold", "Rigid", "Pattern", "Extended"],
    duration: 1130,
    image: require("../../../assets/presets/Alarm.png"),
    play: Presets.alarm,
  },
  {
    name: "Anvil",
    description:
      "The full weight of a massive collision, conveys sheer physical force and momentum.",
    tags: ["Bold", "Soft", "Ramp", "Extended"],
    duration: 500,
    image: require("../../../assets/presets/Anvil.png"),
    play: Presets.anvil,
  },
  {
    name: "Applause",
    description:
      "A growing wave of appreciation, ideal for celebratory moments or social approval.",
    tags: ["Substantial", "Flexible", "Solid", "Long"],
    duration: 1564,
    image: require("../../../assets/presets/Applause.png"),
    play: Presets.applause,
  },
  {
    name: "Ascent",
    description:
      "The rush of leveling up, evoking the classic RPG reward of growth and progression.",
    tags: ["Bold", "Flexible", "Pattern", "Long"],
    duration: 2400,
    image: require("../../../assets/presets/Ascent.png"),
    play: Presets.ascent,
  },
  {
    name: "BalloonPop",
    description:
      "Mounting suspense that bursts into release, perfect for countdowns or suspenseful reveals.",
    tags: ["Substantial", "Flexible", "Bumps", "Long"],
    duration: 1700,
    image: require("../../../assets/presets/BalloonPop.png"),
    play: Presets.balloonPop,
  },
  {
    name: "Barrage",
    description:
      "An overwhelming storm of rapid impacts, suited for maxing out a meter or total sensory overload moments.",
    tags: ["Bold", "Rigid", "Impulses", "Extended"],
    duration: 309,
    image: require("../../../assets/presets/Barrage.png"),
    play: Presets.barrage,
  },
  {
    name: "BassDrop",
    description:
      "Two grounded thumps with a tonal descent, suited for distinct double-confirmation feedback.",
    tags: ["Bold", "Soft", "Impulses", "Impulse"],
    duration: 71,
    image: require("../../../assets/presets/BassDrop.png"),
    play: Presets.bassDrop,
  },
  {
    name: "Batter",
    description:
      "An unrestrained explosion of rage, suited for catastrophic errors or total loss of control.",
    tags: ["Bold", "Flexible", "Saw", "Extended"],
    duration: 380,
    image: require("../../../assets/presets/Batter.png"),
    play: Presets.batter,
  },
  {
    name: "BellToll",
    description:
      "Three notes that soften as they land, suited for closing interactions or softening after a strong start.",
    tags: ["Bold", "Flexible", "Impulses", "Extended"],
    duration: 399,
    image: require("../../../assets/presets/BellToll.png"),
    play: Presets.bellToll,
  },
  {
    name: "Blip",
    description:
      "A composed, subtle heads-up, ideal for non-critical warnings that should not interrupt the user.",
    tags: ["Gentle", "Flexible", "Peak", "Short"],
    duration: 200,
    image: require("../../../assets/presets/Blip.png"),
    play: Presets.blip,
  },
  {
    name: "Bloom",
    description:
      "A quiet confirmation of completion, ideal for subtle task completions or non-intrusive positive reinforcement.",
    tags: ["Gentle", "Flexible", "Bumps", "Extended"],
    duration: 300,
    image: require("../../../assets/presets/Bloom.png"),
    play: Presets.bloom,
  },
  {
    name: "Bongo",
    description:
      "Two balanced bursts of three, suited for structured multi-step or paired sequence feedback.",
    tags: ["Substantial", "Flexible", "Impulses", "Extended"],
    duration: 451,
    image: require("../../../assets/presets/Bongo.png"),
    play: Presets.bongo,
  },
  {
    name: "Boulder",
    description:
      "Deep and weighty without sharpness, great for heavy object impacts or grounded confirmation feedback.",
    tags: ["Bold", "Soft", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Boulder.png"),
    play: Presets.boulder,
  },
  {
    name: "BreakingWave",
    description:
      "Two measured steps leading into a stronger landing, ideal for escalating confirmations or staged actions.",
    tags: ["Substantial", "Flexible", "Impulses", "Short"],
    duration: 202,
    image: require("../../../assets/presets/BreakingWave.png"),
    play: Presets.breakingWave,
  },
  {
    name: "Breath",
    description: "Slow, calming in-and-out rhythm, ideal for breathing exercises.",
    tags: ["Substantial", "Soft", "Bumps", "Long"],
    duration: 3200,
    image: require("../../../assets/presets/Breath.png"),
    play: Presets.breath,
  },
  {
    name: "Buildup",
    description:
      "An energizing crescendo of rising intensity, ideal for charging actions or building anticipation.",
    tags: ["Bold", "Flexible", "Impulses", "Extended"],
    duration: 309,
    image: require("../../../assets/presets/Buildup.png"),
    play: Presets.buildup,
  },
  {
    name: "Burst",
    description:
      "The tension-and-release of a sneeze, imitates the involuntary build and explosion.",
    tags: ["Bold", "Flexible", "Peak", "Extended"],
    duration: 300,
    image: require("../../../assets/presets/Burst.png"),
    play: Presets.burst,
  },
  {
    name: "Buzz",
    description:
      "An unmistakable hard rejection, suited for critical errors, access denied, or blocked actions.",
    tags: ["Bold", "Rigid", "Ramp", "Extended"],
    duration: 350,
    image: require("../../../assets/presets/Buzz.png"),
    play: Presets.buzz,
  },
  {
    name: "Cadence",
    description:
      "A natural two-beat rhythm with a subtle textural shift, suitable for double-tap confirmations.",
    tags: ["Bold", "Rigid", "Impulses", "Short"],
    duration: 199,
    image: require("../../../assets/presets/Cadence.png"),
    play: Presets.cadence,
  },
  {
    name: "CameraShutter",
    description:
      "The satisfying click of capturing a moment, ideal for photo capture or scan confirmation.",
    tags: ["Substantial", "Rigid", "Impulses", "Short"],
    duration: 150,
    image: require("../../../assets/presets/CameraShutter.png"),
    play: Presets.cameraShutter,
  },
  {
    name: "Canter",
    description:
      "A three-beat rhythm with natural variation, suited for multi-step feedback where each step has character.",
    tags: ["Bold", "Soft", "Impulses", "Short"],
    duration: 173,
    image: require("../../../assets/presets/Canter.png"),
    play: Presets.canter,
  },
  {
    name: "Cascade",
    description:
      "A long sequence that unwinds from intensity to calm, ideal for complex multi-phase transitions or step-by-step completions.",
    tags: ["Substantial", "Flexible", "Impulses", "Long"],
    duration: 1863,
    image: require("../../../assets/presets/Cascade.png"),
    play: Presets.cascade,
  },
  {
    name: "Castanets",
    description:
      "A crisp, decisive pair of sharp taps, ideal for double-confirmation or back-to-back interaction feedback.",
    tags: ["Bold", "Rigid", "Impulses", "Short"],
    duration: 199,
    image: require("../../../assets/presets/Castanets.png"),
    play: Presets.castanets,
  },
  {
    name: "CatPaw",
    description:
      "A calm, warm pair of taps, ideal for gentle confirmations or soft paired acknowledgements.",
    tags: ["Substantial", "Soft", "Impulses", "Impulse"],
    duration: 75,
    image: require("../../../assets/presets/CatPaw.png"),
    play: Presets.catPaw,
  },
  {
    name: "Charge",
    description: "The electric buildup of a countdown, perfect for race starts or any go moment.",
    tags: ["Bold", "Rigid", "Pattern", "Long"],
    duration: 2046,
    image: require("../../../assets/presets/Charge.png"),
    play: Presets.charge,
  },
  {
    name: "Chime",
    description: "A warm, friendly double-tap, ideal for incoming messages or chat notifications.",
    tags: ["Substantial", "Flexible", "Bumps", "Extended"],
    duration: 380,
    image: require("../../../assets/presets/Chime.png"),
    play: Presets.chime,
  },
  {
    name: "Chip",
    description:
      "Sharp, authoritative, and precise, suited for confirmations that demand clarity and definition.",
    tags: ["Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Chip.png"),
    play: Presets.chip,
  },
  {
    name: "Chirp",
    description: "Light-hearted and cheerful, ideal for positive micro-interactions or small wins.",
    tags: ["Gentle", "Flexible", "Saw", "Extended"],
    duration: 360,
    image: require("../../../assets/presets/Chirp.png"),
    play: Presets.chirp,
  },
  {
    name: "Clamor",
    description:
      "Impossible to ignore, suited for critical warnings, emergency alerts, or safety-critical states.",
    tags: ["Bold", "Flexible", "Saw", "Extended"],
    duration: 430,
    image: require("../../../assets/presets/Clamor.png"),
    play: Presets.clamor,
  },
  {
    name: "Clasp",
    description:
      "The satisfying snap of acquiring a target, ideal for lock-on, cursor snap-to, or radar acquisition.",
    tags: ["Bold", "Rigid", "Impulses", "Short"],
    duration: 220,
    image: require("../../../assets/presets/Clasp.png"),
    play: Presets.clasp,
  },
  {
    name: "Cleave",
    description:
      "Signals an irreversible, high-stakes action for deletes, removes, or anything the user cannot undo.",
    tags: ["Bold", "Rigid", "Impulses", "Bumps", "Short"],
    duration: 250,
    image: require("../../../assets/presets/Cleave.png"),
    play: Presets.cleave,
  },
  {
    name: "Coil",
    description:
      "Rising tension that releases into certainty, ideal for long-press activation or charge-complete feedback.",
    tags: ["Substantial", "Flexible", "Peak", "Long"],
    duration: 650,
    image: require("../../../assets/presets/Coil.png"),
    play: Presets.coil,
  },
  {
    name: "CoinDrop",
    description:
      "A playful cascade of coins, ideal for reward moments, payment confirmations, or in-app purchases.",
    tags: ["Bold", "Rigid", "Saw", "Extended"],
    duration: 675,
    image: require("../../../assets/presets/CoinDrop.png"),
    play: Presets.coinDrop,
  },
  {
    name: "CombinationLock",
    description:
      "The ritual of cracking a code, ideal for combination inputs or multi-step secure unlocking.",
    tags: ["Bold", "Rigid", "Saw", "Long"],
    duration: 980,
    image: require("../../../assets/presets/CombinationLock.png"),
    play: Presets.combinationLock,
  },
  {
    name: "Crescendo",
    description:
      "A rising build that peaks with energy, ideal for charge-up moments or building anticipation.",
    tags: ["Substantial", "Rigid", "Impulses", "Long"],
    duration: 601,
    image: require("../../../assets/presets/Crescendo.png"),
    play: Presets.crescendo,
  },
  {
    name: "Dewdrop",
    description:
      "A quiet confirmation of success, ideal for operations that completed without needing attention.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 210,
    image: require("../../../assets/presets/Dewdrop.png"),
    play: Presets.dewdrop,
  },
  {
    name: "Dirge",
    description:
      "Heavy and fading like a dying heartache, best for conveying grief, loss, or deep sorrow.",
    tags: ["Substantial", "Soft", "Pattern", "Long"],
    duration: 2600,
    image: require("../../../assets/presets/Dirge.png"),
    play: Presets.dirge,
  },
  {
    name: "Dissolve",
    description:
      "A gentle, soothing fade, ideal for calm relief after a mild challenge or successful low-stakes action.",
    tags: ["Gentle", "Soft", "Ramp", "Long"],
    duration: 1200,
    image: require("../../../assets/presets/Dissolve.png"),
    play: Presets.dissolve,
  },
  {
    name: "DogBark",
    description:
      "Two forceful low bursts like a sharp bark, ideal for alert sounds or short punchy notification moments.",
    tags: ["Bold", "Soft", "Bumps", "Extended"],
    duration: 500,
    image: require("../../../assets/presets/DogBark.png"),
    play: Presets.dogBark,
  },
  {
    name: "Drone",
    description:
      "Flat and going nowhere, communicates idle waiting, disengagement, or nothing happening.",
    tags: ["Gentle", "Flexible", "Pattern", "Long"],
    duration: 1780,
    image: require("../../../assets/presets/Drone.png"),
    play: Presets.drone,
  },
  {
    name: "EngineRev",
    description:
      "The thrill of revving to full throttle, ideal for racing games or mechanical acceleration feedback.",
    tags: ["Bold", "Flexible", "Bumps", "Long"],
    duration: 1800,
    image: require("../../../assets/presets/EngineRev.png"),
    play: Presets.engineRev,
  },
  {
    name: "Exhale",
    description:
      "Tension releasing into calm, ideal for completing a stressful task or resolving an error.",
    tags: ["Substantial", "Flexible", "Ramp", "Long"],
    duration: 1200,
    image: require("../../../assets/presets/Exhale.png"),
    play: Presets.exhale,
  },
  {
    name: "Explosion",
    description:
      "A catastrophic detonation that echoes into rumble, ideal for game destruction events or dramatic impacts.",
    tags: ["Bold", "Soft", "Ramp", "Long"],
    duration: 1000,
    image: require("../../../assets/presets/Explosion.png"),
    play: Presets.explosion,
  },
  {
    name: "FadeOut",
    description:
      "A graceful drift toward silence, ideal for dismissals or transitions that should feel calm and natural.",
    tags: ["Substantial", "Flexible", "Impulses", "Extended"],
    duration: 506,
    image: require("../../../assets/presets/FadeOut.png"),
    play: Presets.fadeOut,
  },
  {
    name: "Fanfare",
    description:
      "A short burst of triumph, ideal for achievement unlocked, rank-ups, or moments that deserve a cheer.",
    tags: ["Bold", "Rigid", "Bumps", "Extended"],
    duration: 580,
    image: require("../../../assets/presets/Fanfare.png"),
    play: Presets.fanfare,
  },
  {
    name: "Feather",
    description: "A gentle, non-disruptive nudge, ideal for low-priority reminders.",
    tags: ["Substantial", "Flexible", "Ramp", "Short"],
    duration: 180,
    image: require("../../../assets/presets/Feather.png"),
    play: Presets.feather,
  },
  {
    name: "Finale",
    description:
      "A countdown that closes with emphasis, ideal for timer completions or countdown-finished alerts.",
    tags: ["Bold", "Flexible", "Bumps", "Long"],
    duration: 680,
    image: require("../../../assets/presets/Finale.png"),
    play: Presets.finale,
  },
  {
    name: "FingerDrum",
    description:
      "Three casual, even taps, ideal for low-key acknowledgements or non-urgent rhythm patterns.",
    tags: ["Substantial", "Flexible", "Impulses", "Extended"],
    duration: 231,
    image: require("../../../assets/presets/FingerDrum.png"),
    play: Presets.fingerDrum,
  },
  {
    name: "Firecracker",
    description:
      "Two maximum-force strikes demanding immediate response, suited for urgent double-confirmations or critical alerts.",
    tags: ["Bold", "Rigid", "Impulses", "Impulse"],
    duration: 75,
    image: require("../../../assets/presets/Firecracker.png"),
    play: Presets.firecracker,
  },
  {
    name: "Fizz",
    description: "Bubbling with joy, ideal for success celebrations or upbeat positive feedback.",
    tags: ["Substantial", "Rigid", "Saw", "Extended"],
    duration: 500,
    image: require("../../../assets/presets/Fizz.png"),
    play: Presets.fizz,
  },
  {
    name: "Flare",
    description:
      "A mind-blowing jolt, ideal for overwhelming surprise or impossible-to-believe reveals.",
    tags: ["Bold", "Rigid", "Peak", "Extended"],
    duration: 380,
    image: require("../../../assets/presets/Flare.png"),
    play: Presets.flare,
  },
  {
    name: "Flick",
    description: "A light, quick tap with minimal presence, ideal for chips, tags, and filters.",
    tags: ["Gentle", "Flexible", "Peak", "Impulse"],
    duration: 80,
    image: require("../../../assets/presets/Flick.png"),
    play: Presets.flick,
  },
  {
    name: "Flinch",
    description: "A shock to the senses, ideal for unexpected alerts or startling reveals.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 280,
    image: require("../../../assets/presets/Flinch.png"),
    play: Presets.flinch,
  },
  {
    name: "Flourish",
    description:
      "Triumphant and expansive, ideal for achievement unlocked or major task completions.",
    tags: ["Bold", "Rigid", "Peak", "Long"],
    duration: 917,
    image: require("../../../assets/presets/Flourish.png"),
    play: Presets.flourish,
  },
  {
    name: "Flurry",
    description:
      "The thrill of a combo streak, ideal for hit combos, chain multipliers, or rapid-fire scoring.",
    tags: ["Bold", "Rigid", "Bumps", "Extended"],
    duration: 300,
    image: require("../../../assets/presets/Flurry.png"),
    play: Presets.flurry,
  },
  {
    name: "Flush",
    description:
      "The involuntary heave of disgust, ideal for aversion reactions or gross-out moments in playful UI contexts.",
    tags: ["Bold", "Flexible", "Peak", "Extended"],
    duration: 380,
    image: require("../../../assets/presets/Flush.png"),
    play: Presets.flush,
  },
  {
    name: "Gallop",
    description:
      "A natural four-beat rhythm, suited for multi-step processes or organic rhythmic feedback.",
    tags: ["Bold", "Flexible", "Impulses", "Long"],
    duration: 750,
    image: require("../../../assets/presets/Gallop.png"),
    play: Presets.gallop,
  },
  {
    name: "Gavel",
    description:
      "Two weighty, deliberate taps, suited for decisive double-step actions or bold acknowledgement feedback.",
    tags: ["Bold", "Flexible", "Impulses", "Short"],
    duration: 201,
    image: require("../../../assets/presets/Gavel.png"),
    play: Presets.gavel,
  },
  {
    name: "Glitch",
    description:
      "The haptic feel of a system glitching, ideal for data corruption, errors, or intentional glitch aesthetics.",
    tags: ["Bold", "Rigid", "Pattern", "Short"],
    duration: 220,
    image: require("../../../assets/presets/Glitch.png"),
    play: Presets.glitch,
  },
  {
    name: "GuitarStrum",
    description:
      "A rich, resonant strike that lingers, ideal for musical interactions or warm confirmation moments.",
    tags: ["Bold", "Flexible", "Ramp", "Long"],
    duration: 1400,
    image: require("../../../assets/presets/GuitarStrum.png"),
    play: Presets.guitarStrum,
  },
  {
    name: "Hail",
    description:
      "An unpredictable, relentless barrage, ideal for weather events or disorienting overload feedback.",
    tags: ["Gentle", "Rigid", "Solid", "Extended"],
    duration: 430,
    image: require("../../../assets/presets/Hail.png"),
    play: Presets.hail,
  },
  {
    name: "Hammer",
    description:
      "The insistent urgency of a fist on a door, ideal for forceful alerts or escalating persistent notifications.",
    tags: ["Bold", "Soft", "Saw", "Long"],
    duration: 1050,
    image: require("../../../assets/presets/Hammer.png"),
    play: Presets.hammer,
  },
  {
    name: "Heartbeat",
    description:
      "The familiar lub-dub of life and tension, perfect for health apps or anxious waiting moments.",
    tags: ["Substantial", "Soft", "Pattern", "Long"],
    duration: 1000,
    image: require("../../../assets/presets/Heartbeat.png"),
    play: Presets.heartbeat,
  },
  {
    name: "Herald",
    description:
      "Two gentle knocks building to a decisive third, ideal for staged confirmations with a clear conclusion.",
    tags: ["Substantial", "Rigid", "Impulses", "Short"],
    duration: 208,
    image: require("../../../assets/presets/Herald.png"),
    play: Presets.herald,
  },
  {
    name: "HoofBeat",
    description:
      "Two warm, grounded taps, ideal for mellow double confirmations or soft paired feedback.",
    tags: ["Bold", "Soft", "Impulses", "Short"],
    duration: 201,
    image: require("../../../assets/presets/HoofBeat.png"),
    play: Presets.hoofBeat,
  },
  {
    name: "Ignition",
    description:
      "Three beats that sharpen with each hit, ideal for staged confirmations or escalating emphasis.",
    tags: ["Bold", "Flexible", "Impulses", "Short"],
    duration: 173,
    image: require("../../../assets/presets/Ignition.png"),
    play: Presets.ignition,
  },
  {
    name: "Impact",
    description:
      "The instant punch of impact, perfect for collision events or taking a hit in games.",
    tags: ["Bold", "Flexible", "Peak", "Short"],
    duration: 200,
    image: require("../../../assets/presets/Impact.png"),
    play: Presets.impact,
  },
  {
    name: "Jolt",
    description:
      "The most intense hit possible, suited for critical alerts or any moment that demands absolute impact.",
    tags: ["Bold", "Rigid", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Jolt.png"),
    play: Presets.jolt,
  },
  {
    name: "KeyboardMechanical",
    description:
      "The satisfying two-stage snap of a mechanical key, great for precision typing or keyboard simulations.",
    tags: ["Gentle", "Flexible", "Impulses", "Impulse"],
    duration: 55,
    image: require("../../../assets/presets/KeyboardMechanical.png"),
    play: Presets.keyboardMechanical,
  },
  {
    name: "KeyboardMembrane",
    description:
      "A soft, muffled press, best for simulating the quiet feel of a membrane keyboard.",
    tags: ["Gentle", "Soft", "Impulses", "Short"],
    duration: 140,
    image: require("../../../assets/presets/KeyboardMembrane.png"),
    play: Presets.keyboardMembrane,
  },
  {
    name: "Knell",
    description:
      "A commanding last-chance signal, ideal for final reminders or deadline-critical alerts.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 550,
    image: require("../../../assets/presets/Knell.png"),
    play: Presets.knell,
  },
  {
    name: "Knock",
    description:
      "A polite knock announcing arrival, ideal for gentle attention requests or non-urgent presence alerts.",
    tags: ["Substantial", "Soft", "Bumps", "Long"],
    duration: 760,
    image: require("../../../assets/presets/Knock.png"),
    play: Presets.knock,
  },
  {
    name: "Lament",
    description:
      "The sinking finality of defeat, captures the deflating feeling of a game-over moment.",
    tags: ["Bold", "Flexible", "Pattern", "Long"],
    duration: 2450,
    image: require("../../../assets/presets/Lament.png"),
    play: Presets.lament,
  },
  {
    name: "Latch",
    description:
      "The clear feel of something switching off, communicates deactivation or opting out.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 230,
    image: require("../../../assets/presets/Latch.png"),
    play: Presets.latch,
  },
  {
    name: "Lighthouse",
    description:
      "Steady and bias-free, suitable for neutral status updates or steady-state notifications.",
    tags: ["Substantial", "Flexible", "Pattern", "Long"],
    duration: 1050,
    image: require("../../../assets/presets/Lighthouse.png"),
    play: Presets.lighthouse,
  },
  {
    name: "Lilt",
    description:
      "Warm and personal, ideal for direct messages or social notifications from people you know.",
    tags: ["Substantial", "Flexible", "Bumps", "Extended"],
    duration: 360,
    image: require("../../../assets/presets/Lilt.png"),
    play: Presets.lilt,
  },
  {
    name: "Lock",
    description:
      "The satisfying click of locking into place, ideal for locking, latching, or secure-confirmation interactions.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 220,
    image: require("../../../assets/presets/Lock.png"),
    play: Presets.lock,
  },
  {
    name: "Lope",
    description: "A galloping bounce with swagger, ideal for adventurous or playful UI moments.",
    tags: ["Substantial", "Rigid", "Pattern", "Extended"],
    duration: 450,
    image: require("../../../assets/presets/Lope.png"),
    play: Presets.lope,
  },
  {
    name: "March",
    description:
      "Like an encouraging pat on the back, ideal for motivational confirmations or achievement feedback.",
    tags: ["Substantial", "Soft", "Bumps", "Long"],
    duration: 900,
    image: require("../../../assets/presets/March.png"),
    play: Presets.march,
  },
  {
    name: "Metronome",
    description:
      "Balanced and unemotional, ideal for neutral confirmations, pagination steps, or generic two-step feedback.",
    tags: ["Substantial", "Flexible", "Impulses", "Extended"],
    duration: 280,
    image: require("../../../assets/presets/Metronome.png"),
    play: Presets.metronome,
  },
  {
    name: "Murmur",
    description:
      "Two soft, quiet taps, ideal for subtle double-step interactions or unobtrusive confirmations.",
    tags: ["Substantial", "Soft", "Impulses", "Impulse"],
    duration: 80,
    image: require("../../../assets/presets/Murmur.png"),
    play: Presets.murmur,
  },
  {
    name: "Nudge",
    description:
      "A polite, unobtrusive double tap that announces a notification without being intrusive.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 180,
    image: require("../../../assets/presets/Nudge.png"),
    play: Presets.nudge,
  },
  {
    name: "PassingCar",
    description:
      "The whoosh of something passing at speed, ideal for vehicle pass-by or motion-blur effects.",
    tags: ["Bold", "Flexible", "Peak", "Long"],
    duration: 1100,
    image: require("../../../assets/presets/PassingCar.png"),
    play: Presets.passingCar,
  },
  {
    name: "Patter",
    description:
      "Three mild, unforced taps, ideal for low-key acknowledgements or non-urgent triple feedback.",
    tags: ["Substantial", "Soft", "Impulses", "Short"],
    duration: 179,
    image: require("../../../assets/presets/Patter.png"),
    play: Presets.patter,
  },
  {
    name: "Peal",
    description:
      "Firm and measured, conveys that something needs attention soon without triggering panic.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 438,
    image: require("../../../assets/presets/Peal.png"),
    play: Presets.peal,
  },
  {
    name: "Peck",
    description: "An ultra-short, precise tap, perfect for small icon buttons.",
    tags: ["Gentle", "Flexible", "Peak", "Impulse"],
    duration: 28,
    image: require("../../../assets/presets/Peck.png"),
    play: Presets.peck,
  },
  {
    name: "Pendulum",
    description:
      "A rhythmic swing that gradually settles, ideal for winding-down moments or calm settling effects.",
    tags: ["Substantial", "Flexible", "Bumps", "Long"],
    duration: 2400,
    image: require("../../../assets/presets/Pendulum.png"),
    play: Presets.pendulum,
  },
  {
    name: "Ping",
    description:
      "A precise, definitive click, ideal for list selections or any interaction where clarity of choice matters.",
    tags: ["Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 35,
    image: require("../../../assets/presets/Ping.png"),
    play: Presets.ping,
  },
  {
    name: "Pip",
    description: "A light, sparkling burst, ideal for in-game collectibles or power-up feedback.",
    tags: ["Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 100,
    image: require("../../../assets/presets/Pip.png"),
    play: Presets.pip,
  },
  {
    name: "Piston",
    description:
      "Two forceful, immediate strikes, ideal for commanding double-confirmations or high-energy paired actions.",
    tags: ["Bold", "Flexible", "Impulses", "Impulse"],
    duration: 73,
    image: require("../../../assets/presets/Piston.png"),
    play: Presets.piston,
  },
  {
    name: "Plink",
    description: "A neutral heads-up suited as a baseline for informational notifications.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 215,
    image: require("../../../assets/presets/Plink.png"),
    play: Presets.plink,
  },
  {
    name: "Plummet",
    description:
      "The terrifying pause before impact, ideal for drop effects or dramatic collision moments.",
    tags: ["Bold", "Soft", "Peak", "Long"],
    duration: 1050,
    image: require("../../../assets/presets/Plummet.png"),
    play: Presets.plummet,
  },
  {
    name: "Plunk",
    description:
      "Understated but present, suitable for subdued feedback that still has noticeable weight.",
    tags: ["Substantial", "Soft", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Plunk.png"),
    play: Presets.plunk,
  },
  {
    name: "Poke",
    description:
      "Someone specifically called your name, ideal for mentions, tags, or direct-attention notifications.",
    tags: ["Substantial", "Flexible", "Bumps", "Extended"],
    duration: 280,
    image: require("../../../assets/presets/Poke.png"),
    play: Presets.poke,
  },
  {
    name: "Pound",
    description:
      "Impossible to ignore, ideal for critical alerts or notifications that cannot wait.",
    tags: ["Bold", "Rigid", "Bumps", "Extended"],
    duration: 265,
    image: require("../../../assets/presets/Pound.png"),
    play: Presets.pound,
  },
  {
    name: "PowerDown",
    description:
      "A steady deceleration to silence, communicates shutdown, power-off, or deactivation.",
    tags: ["Bold", "Flexible", "Ramp", "Long"],
    duration: 1800,
    image: require("../../../assets/presets/PowerDown.png"),
    play: Presets.powerDown,
  },
  {
    name: "Propel",
    description:
      "A confident forward push communicating that a form or action has been decisively submitted.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 300,
    image: require("../../../assets/presets/Propel.png"),
    play: Presets.propel,
  },
  {
    name: "Pulse",
    description:
      "A gentle, steady pulse that quietly signals ongoing activity without demanding attention.",
    tags: ["Gentle", "Flexible", "Bumps", "Long"],
    duration: 2000,
    image: require("../../../assets/presets/Pulse.png"),
    play: Presets.pulse,
  },
  {
    name: "Pummel",
    description:
      "Escalating rage that peaks at full force, suited for blocked actions, critical failures, or frustrated moments.",
    tags: ["Bold", "Rigid", "Saw", "Extended"],
    duration: 450,
    image: require("../../../assets/presets/Pummel.png"),
    play: Presets.pummel,
  },
  {
    name: "Push",
    description: "A quieter click that supports without competing, ideal for secondary actions.",
    tags: ["Gentle", "Flexible", "Peak", "Impulse"],
    duration: 90,
    image: require("../../../assets/presets/Push.png"),
    play: Presets.push,
  },
  {
    name: "Radar",
    description:
      "The focused sweep of active scanning, ideal for network requests or polling states.",
    tags: ["Substantial", "Flexible", "Pattern", "Long"],
    duration: 2520,
    image: require("../../../assets/presets/Radar.png"),
    play: Presets.radar,
  },
  {
    name: "Rain",
    description:
      "Soft and unpredictable, ideal for ambient atmospheric effects or organic ambient notifications.",
    tags: ["Gentle", "Flexible", "Pattern", "Long"],
    duration: 950,
    image: require("../../../assets/presets/Rain.png"),
    play: Presets.rain,
  },
  {
    name: "Ramp",
    description:
      "The joy of growing stronger, ideal for level-up moments or rank promotion celebrations.",
    tags: ["Bold", "Rigid", "Bumps", "Long"],
    duration: 650,
    image: require("../../../assets/presets/Ramp.png"),
    play: Presets.ramp,
  },
  {
    name: "Rap",
    description:
      "A clean double-knock that announces an alert quietly, ideal for non-urgent in-app notifications.",
    tags: ["Substantial", "Flexible", "Bumps", "Short"],
    duration: 120,
    image: require("../../../assets/presets/Rap.png"),
    play: Presets.rap,
  },
  {
    name: "Ratchet",
    description:
      "A firm, assertive triple beat, suited for strong confirmations or emphatic acknowledgements.",
    tags: ["Bold", "Rigid", "Impulses", "Extended"],
    duration: 398,
    image: require("../../../assets/presets/Ratchet.png"),
    play: Presets.ratchet,
  },
  {
    name: "Rebound",
    description:
      "A strong opening that softens on the second hit, ideal for double-tap confirmations.",
    tags: ["Bold", "Rigid", "Impulses", "Impulse"],
    duration: 80,
    image: require("../../../assets/presets/Rebound.png"),
    play: Presets.rebound,
  },
  {
    name: "Ripple",
    description:
      "A strong hit that radiates outward in softening waves, ideal for touch ripples or impact echo effects.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 420,
    image: require("../../../assets/presets/Ripple.png"),
    play: Presets.ripple,
  },
  {
    name: "Rivet",
    description:
      "Three sharp, assertive beats, suited for triple-step confirmations or high-confidence feedback.",
    tags: ["Bold", "Rigid", "Impulses", "Short"],
    duration: 150,
    image: require("../../../assets/presets/Rivet.png"),
    play: Presets.rivet,
  },
  {
    name: "Rustle",
    description:
      "A gentle heads-up that does not demand immediate action, ideal for mild warnings.",
    tags: ["Substantial", "Flexible", "Bumps", "Extended"],
    duration: 290,
    image: require("../../../assets/presets/Rustle.png"),
    play: Presets.rustle,
  },
  {
    name: "Shockwave",
    description:
      "The pressure wave of a nearby explosion, ideal for detonations, force fields, or dramatic impacts.",
    tags: ["Bold", "Flexible", "Ramp", "Long"],
    duration: 800,
    image: require("../../../assets/presets/Shockwave.png"),
    play: Presets.shockwave,
  },
  {
    name: "Snap",
    description:
      "A firm snap that conveys a locked-in selection, perfect for toggles, switches, or confirming a choice.",
    tags: ["Substantial", "Flexible", "Impulses", "Impulse"],
    duration: 90,
    image: require("../../../assets/presets/Snap.png"),
    play: Presets.snap,
  },
  {
    name: "Sonar",
    description:
      "The eureka moment, ideal for conveying the satisfying rush of finding what you were looking for.",
    tags: ["Bold", "Rigid", "Pattern", "Long"],
    duration: 2000,
    image: require("../../../assets/presets/Sonar.png"),
    play: Presets.sonar,
  },
  {
    name: "Spark",
    description:
      "The snap of electric ignition, ideal for discharge effects, ignition moments, or quick-fire activation.",
    tags: ["Bold", "Rigid", "Peak", "Short"],
    duration: 185,
    image: require("../../../assets/presets/Spark.png"),
    play: Presets.spark,
  },
  {
    name: "Spin",
    description:
      "A crisp, mechanical rhythm communicating repeating progress, great for looping or spinner states.",
    tags: ["Substantial", "Flexible", "Saw", "Long"],
    duration: 1808,
    image: require("../../../assets/presets/Spin.png"),
    play: Presets.spin,
  },
  {
    name: "Stagger",
    description:
      "Woozy and disorienting, ideal for confusion, error overload, or hit-stun effects.",
    tags: ["Substantial", "Flexible", "Saw", "Extended"],
    duration: 320,
    image: require("../../../assets/presets/Stagger.png"),
    play: Presets.stagger,
  },
  {
    name: "Stamp",
    description:
      "Calm and decisive, communicates acceptance without drama, suited for dialog confirmations.",
    tags: ["Substantial", "Soft", "Impulses", "Short"],
    duration: 205,
    image: require("../../../assets/presets/Stamp.png"),
    play: Presets.stamp,
  },
  {
    name: "Stampede",
    description:
      "Four deep, measured thumps, suited for grounded step-by-step confirmation feedback.",
    tags: ["Bold", "Soft", "Impulses", "Long"],
    duration: 750,
    image: require("../../../assets/presets/Stampede.png"),
    play: Presets.stampede,
  },
  {
    name: "Stomp",
    description:
      "Three deep, grounded beats, suitable for unhurried triple confirmations or calm rhythmic emphasis.",
    tags: ["Bold", "Soft", "Impulses", "Short"],
    duration: 150,
    image: require("../../../assets/presets/Stomp.png"),
    play: Presets.stomp,
  },
  {
    name: "StoneSkip",
    description:
      "Three firm taps with a softening finish, suited for decisive but composed triple confirmations.",
    tags: ["Bold", "Flexible", "Impulses", "Short"],
    duration: 181,
    image: require("../../../assets/presets/StoneSkip.png"),
    play: Presets.stoneSkip,
  },
  {
    name: "Strike",
    description:
      "A confident, decisive strike that delivers a clear and satisfying response for the main call-to-action.",
    tags: ["Substantial", "Flexible", "Peak", "Impulse"],
    duration: 80,
    image: require("../../../assets/presets/Strike.png"),
    play: Presets.strike,
  },
  {
    name: "Summon",
    description:
      "A commanding signal that refuses to be ignored, ideal for incoming calls or urgent attention-demand moments.",
    tags: ["Bold", "Flexible", "Bumps", "Extended"],
    duration: 500,
    image: require("../../../assets/presets/Summon.png"),
    play: Presets.summon,
  },
  {
    name: "Surge",
    description:
      "An irrepressible swell of delight, ideal for reaction moments or expressions of pure joy.",
    tags: ["Bold", "Rigid", "Saw", "Extended"],
    duration: 330,
    image: require("../../../assets/presets/Surge.png"),
    play: Presets.surge,
  },
  {
    name: "Sway",
    description: "Reassuring and rhythmic, ideal for calming or encouraging feedback.",
    tags: ["Substantial", "Soft", "Bumps", "Long"],
    duration: 1900,
    image: require("../../../assets/presets/Sway.png"),
    play: Presets.sway,
  },
  {
    name: "Sweep",
    description:
      "The rhythmic pulse of active searching, ideal for search operations or background polling states.",
    tags: ["Substantial", "Rigid", "Pattern", "Long"],
    duration: 2100,
    image: require("../../../assets/presets/Sweep.png"),
    play: Presets.sweep,
  },
  {
    name: "Swell",
    description:
      "A patient nudge that quietly escalates, ideal for reminders that build attention without anxiety.",
    tags: ["Substantial", "Flexible", "Bumps", "Extended"],
    duration: 425,
    image: require("../../../assets/presets/Swell.png"),
    play: Presets.swell,
  },
  {
    name: "Syncopate",
    description:
      "A lively three-beat rhythm with mixed texture, ideal for multi-step confirmations or animated feedback.",
    tags: ["Bold", "Rigid", "Impulses", "Extended"],
    duration: 399,
    image: require("../../../assets/presets/Syncopate.png"),
    play: Presets.syncopate,
  },
  {
    name: "Throb",
    description:
      "An accelerated heartbeat that signals something is wrong, ideal for pre-danger tension or warning states.",
    tags: ["Substantial", "Flexible", "Impulses", "Short"],
    duration: 230,
    image: require("../../../assets/presets/Throb.png"),
    play: Presets.throb,
  },
  {
    name: "Thud",
    description: "A soft, warm acknowledgement, ideal for opening a menu or drawer.",
    tags: ["Substantial", "Flexible", "Peak", "Short"],
    duration: 160,
    image: require("../../../assets/presets/Thud.png"),
    play: Presets.thud,
  },
  {
    name: "Thump",
    description:
      "Confident and present without being harsh, useful for bold feedback that avoids aggression.",
    tags: ["Bold", "Flexible", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Thump.png"),
    play: Presets.thump,
  },
  {
    name: "Thunder",
    description:
      "The raw power of a thunderstorm, ideal for dramatic reveals or moments of overwhelming force.",
    tags: ["Bold", "Soft", "Peak", "Long"],
    duration: 2000,
    image: require("../../../assets/presets/Thunder.png"),
    play: Presets.thunder,
  },
  {
    name: "ThunderRoll",
    description:
      "A dramatic arc of mounting intensity, ideal for thunderstorm effects or climactic UI transitions.",
    tags: ["Bold", "Flexible", "Impulses", "Long"],
    duration: 670,
    image: require("../../../assets/presets/ThunderRoll.png"),
    play: Presets.thunderRoll,
  },
  {
    name: "TickTock",
    description:
      "The steady pulse of time, ideal for timing feedback, countdowns, or metronome-style interactions.",
    tags: ["Bold", "Flexible", "Pattern", "Long"],
    duration: 1200,
    image: require("../../../assets/presets/TickTock.png"),
    play: Presets.tickTock,
  },
  {
    name: "TidalSurge",
    description:
      "Two waves of escalating intensity, suited for compound actions or impactful paired confirmations.",
    tags: ["Bold", "Flexible", "Impulses", "Extended"],
    duration: 455,
    image: require("../../../assets/presets/TidalSurge.png"),
    play: Presets.tidalSurge,
  },
  {
    name: "TideSwell",
    description:
      "A long wave-like arc that rises and falls, ideal for extended ambient effects or fluid UI transitions.",
    tags: ["Substantial", "Flexible", "Impulses", "Long"],
    duration: 727,
    image: require("../../../assets/presets/TideSwell.png"),
    play: Presets.tideSwell,
  },
  {
    name: "Tremor",
    description:
      "Pure, heavy rumble with no sharpness, ideal for seismic events or maximum-weight impact simulations.",
    tags: ["Bold", "Soft", "Impulses", "Impulse"],
    duration: 0,
    image: require("../../../assets/presets/Tremor.png"),
    play: Presets.tremor,
  },
  {
    name: "Trigger",
    description:
      "The decisive moment of release, ideal for weapon discharge, trigger confirmation, or releasing a charged gesture.",
    tags: ["Bold", "Flexible", "Peak", "Extended"],
    duration: 280,
    image: require("../../../assets/presets/Trigger.png"),
    play: Presets.trigger,
  },
  {
    name: "Triumph",
    description: "Pure triumph, conveys the overwhelming joy of a major win or achievement.",
    tags: ["Bold", "Flexible", "Saw", "Long"],
    duration: 1100,
    image: require("../../../assets/presets/Triumph.png"),
    play: Presets.triumph,
  },
  {
    name: "Trumpet",
    description:
      "A joyful flourish that peaks in triumph, ideal for celebrations or milestone completions.",
    tags: ["Bold", "Flexible", "Saw", "Extended"],
    duration: 460,
    image: require("../../../assets/presets/Trumpet.png"),
    play: Presets.trumpet,
  },
  {
    name: "Typewriter",
    description:
      "The nostalgic thud of a vintage typewriter, perfect for retro keyboard or analog-feel experiences.",
    tags: ["Bold", "Flexible", "Peak", "Short"],
    duration: 200,
    image: require("../../../assets/presets/Typewriter.png"),
    play: Presets.typewriter,
  },
  {
    name: "Unfurl",
    description:
      "The unmistakable thrill of discovery, evoking the iconic joy of opening a treasure chest.",
    tags: ["Bold", "Flexible", "Pattern", "Long"],
    duration: 1180,
    image: require("../../../assets/presets/Unfurl.png"),
    play: Presets.unfurl,
  },
  {
    name: "Vortex",
    description:
      "An irresistible pull into the unknown, ideal for drain animations or dramatic disappearing transitions.",
    tags: ["Substantial", "Flexible", "Peak", "Long"],
    duration: 1400,
    image: require("../../../assets/presets/Vortex.png"),
    play: Presets.vortex,
  },
  {
    name: "Wane",
    description: "A lazy, dismissive fade, fitting for sarcastic or indifferent UI moments.",
    tags: ["Gentle", "Flexible", "Ramp", "Extended"],
    duration: 450,
    image: require("../../../assets/presets/Wane.png"),
    play: Presets.wane,
  },
  {
    name: "WarDrum",
    description:
      "Three steady drum-like beats, ideal for grounded triple confirmations or structured repetitive feedback.",
    tags: ["Bold", "Soft", "Impulses", "Extended"],
    duration: 398,
    image: require("../../../assets/presets/WarDrum.png"),
    play: Presets.warDrum,
  },
  {
    name: "Waterfall",
    description:
      "A rush of energy that spills and softens, ideal for clearing actions or flowing state transitions.",
    tags: ["Bold", "Flexible", "Impulses", "Extended"],
    duration: 309,
    image: require("../../../assets/presets/Waterfall.png"),
    play: Presets.waterfall,
  },
  {
    name: "Wave",
    description:
      "Gentle and uninterrupting, communicates ongoing activity without breaking the user's focus.",
    tags: ["Substantial", "Soft", "Bumps", "Long"],
    duration: 2800,
    image: require("../../../assets/presets/Wave.png"),
    play: Presets.wave,
  },
  {
    name: "Wisp",
    description:
      "A barely-there touch, best for ghost or outline buttons that should feel subtle and unobtrusive.",
    tags: ["Gentle", "Flexible", "Peak", "Impulse"],
    duration: 60,
    image: require("../../../assets/presets/Wisp.png"),
    play: Presets.wisp,
  },
  {
    name: "Wobble",
    description:
      "A gentle correction without alarm, ideal for minor validation errors or soft negative feedback.",
    tags: ["Substantial", "Rigid", "Peak", "Ramp", "Short"],
    duration: 180,
    image: require("../../../assets/presets/Wobble.png"),
    play: Presets.wobble,
  },
  {
    name: "Woodpecker",
    description:
      "Mechanical and relentless, ideal for repetitive automated sequences where precision is key.",
    tags: ["Bold", "Rigid", "Solid", "Extended"],
    duration: 460,
    image: require("../../../assets/presets/Woodpecker.png"),
    play: Presets.woodpecker,
  },
  {
    name: "Zipper",
    description:
      "The familiar drag and snap of a zipper closing, ideal for closure interactions or drawer animations.",
    tags: ["Gentle", "Flexible", "Solid", "Extended"],
    duration: 460,
    image: require("../../../assets/presets/Zipper.png"),
    play: Presets.zipper,
  },
];

export const IOSPresetsConfig: IPresetConfig[] = [
  {
    name: "SystemImpactHeavy",
    description: "UIImpactFeedbackGenerator.heavy",
    tags: ["System", "Bold", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemImpactHeavy.png"),
    play: Presets.System.impactHeavy,
  },
  {
    name: "SystemImpactLight",
    description: "UIImpactFeedbackGenerator.light",
    tags: ["System", "Gentle", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemImpactLight.png"),
    play: Presets.System.impactLight,
  },
  {
    name: "SystemImpactMedium",
    description: "UIImpactFeedbackGenerator.medium",
    tags: ["System", "Substantial", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemImpactMedium.png"),
    play: Presets.System.impactMedium,
  },
  {
    name: "SystemImpactRigid",
    description: "UIImpactFeedbackGenerator.rigid",
    tags: ["System", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemImpactRigid.png"),
    play: Presets.System.impactRigid,
  },
  {
    name: "SystemImpactSoft",
    description: "UIImpactFeedbackGenerator.soft",
    tags: ["System", "Gentle", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemImpactSoft.png"),
    play: Presets.System.impactSoft,
  },
  {
    name: "SystemNotificationError",
    description: "UINotificationFeedbackGenerator.error",
    tags: ["System", "Substantial", "Elastic", "Impulses", "Extended"],
    duration: 250,
    image: require("../../../assets/systemPresets/ios/SystemNotificationError.png"),
    play: Presets.System.notificationError,
  },
  {
    name: "SystemNotificationSuccess",
    description: "UINotificationFeedbackGenerator.success",
    tags: ["System", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 160,
    image: require("../../../assets/systemPresets/ios/SystemNotificationSuccess.png"),
    play: Presets.System.notificationSuccess,
  },
  {
    name: "SystemNotificationWarning",
    description: "UINotificationFeedbackGenerator.warning",
    tags: ["System", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 160,
    image: require("../../../assets/systemPresets/ios/SystemNotificationWarning.png"),
    play: Presets.System.notificationWarning,
  },
  {
    name: "SystemSelection",
    description: "UISelectionFeedbackGenerator.selection",
    tags: ["System", "Gentle", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/ios/SystemSelection.png"),
    play: Presets.System.selection,
  },
];

export const AndroidPresetsConfig: IPresetConfig[] = [
  {
    name: "SystemCalendarDate",
    description: "HapticFeedbackConstants.CALENDAR_DATE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemCalendarDatePreset.png"),
    play: Presets.System.Android.calendarDate,
  },
  {
    name: "SystemClockTick",
    description: "HapticFeedbackConstants.CLOCK_TICK (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemClockTickPreset.png"),
    play: Presets.System.Android.clockTick,
  },
  {
    name: "SystemConfirm",
    description: "HapticFeedbackConstants.CONFIRM (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemConfirmPreset.png"),
    play: Presets.System.Android.confirm,
  },
  {
    name: "SystemContextClick",
    description: "HapticFeedbackConstants.CONTEXT_CLICK (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemContextClickPreset.png"),
    play: Presets.System.Android.contextClick,
  },
  {
    name: "SystemDragCrossing",
    description: "HapticFeedbackConstants.DRAG_CROSSING (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemDragCrossingPreset.png"),
    play: Presets.System.Android.dragCrossing,
  },
  {
    name: "SystemDragStart",
    description: "HapticFeedbackConstants.DRAG_START (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Bold", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemDragStartPreset.png"),
    play: Presets.System.Android.dragStart,
  },
  {
    name: "SystemEdgeRelease",
    description: "HapticFeedbackConstants.EDGE_RELEASE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemEdgeReleasePreset.png"),
    play: Presets.System.Android.edgeRelease,
  },
  {
    name: "SystemEdgeSqueeze",
    description: "HapticFeedbackConstants.EDGE_SQUEEZE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Bold", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemEdgeSqueezePreset.png"),
    play: Presets.System.Android.edgeSqueeze,
  },
  {
    name: "SystemEffectClick",
    description: "VibrationEffect.EFFECT_CLICK",
    tags: ["System", "Android", "Effect", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemEffectClickPreset.png"),
    play: Presets.System.Android.effectClick,
  },
  {
    name: "SystemEffectDoubleClick",
    description: "VibrationEffect.EFFECT_DOUBLE_CLICK",
    tags: ["System", "Android", "Effect", "Bold", "Flexible", "Impulses", "Short"],
    duration: 170,
    image: require("../../../assets/systemPresets/android/SystemEffectDoubleClickPreset.png"),
    play: Presets.System.Android.effectDoubleClick,
  },
  {
    name: "SystemEffectHeavyClick",
    description: "VibrationEffect.EFFECT_HEAVY_CLICK",
    tags: ["System", "Android", "Effect", "Bold", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemEffectHeavyClickPreset.png"),
    play: Presets.System.Android.effectHeavyClick,
  },
  {
    name: "SystemEffectTick",
    description: "VibrationEffect.EFFECT_TICK",
    tags: ["System", "Android", "Effect", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemEffectTickPreset.png"),
    play: Presets.System.Android.effectTick,
  },
  {
    name: "SystemGestureEnd",
    description: "HapticFeedbackConstants.GESTURE_END (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemGestureEndPreset.png"),
    play: Presets.System.Android.gestureEnd,
  },
  {
    name: "SystemGestureStart",
    description: "HapticFeedbackConstants.GESTURE_START (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemGestureStartPreset.png"),
    play: Presets.System.Android.gestureStart,
  },
  {
    name: "SystemImpactHeavy",
    description: "Fallback implementation of iOS UIImpactFeedbackGenerator.heavy preset.",
    tags: ["iOS Fallback", "Bold", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemImpactHeavy.png"),
    play: Presets.System.impactHeavy,
  },
  {
    name: "SystemImpactLight",
    description: "Fallback implementation of iOS UIImpactFeedbackGenerator.light preset.",
    tags: ["iOS Fallback", "Gentle", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemImpactLight.png"),
    play: Presets.System.impactLight,
  },
  {
    name: "SystemImpactMedium",
    description: "Fallback implementation of iOS UIImpactFeedbackGenerator.medium preset.",
    tags: ["iOS Fallback", "Substantial", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemImpactMedium.png"),
    play: Presets.System.impactMedium,
  },
  {
    name: "SystemImpactRigid",
    description: "Fallback implementation of iOS UIImpactFeedbackGenerator.rigid preset.",
    tags: ["iOS Fallback", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemImpactRigid.png"),
    play: Presets.System.impactRigid,
  },
  {
    name: "SystemImpactSoft",
    description: "Fallback implementation of iOS UIImpactFeedbackGenerator.soft preset.",
    tags: ["iOS Fallback", "Gentle", "Soft", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemImpactSoft.png"),
    play: Presets.System.impactSoft,
  },
  {
    name: "SystemKeyboardPress",
    description: "HapticFeedbackConstants.KEYBOARD_PRESS (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemKeyboardPressPreset.png"),
    play: Presets.System.Android.keyboardPress,
  },
  {
    name: "SystemKeyboardRelease",
    description: "HapticFeedbackConstants.KEYBOARD_RELEASE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemKeyboardReleasePreset.png"),
    play: Presets.System.Android.keyboardRelease,
  },
  {
    name: "SystemKeyboardTap",
    description: "HapticFeedbackConstants.KEYBOARD_TAP (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemKeyboardTapPreset.png"),
    play: Presets.System.Android.keyboardTap,
  },
  {
    name: "SystemLongPress",
    description: "HapticFeedbackConstants.LONG_PRESS (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Bold", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemLongPressPreset.png"),
    play: Presets.System.Android.longPress,
  },
  {
    name: "SystemNotificationError",
    description: "Fallback implementation of iOS UINotificationFeedbackGenerator.error preset.",
    tags: ["iOS Fallback", "Substantial", "Elastic", "Impulses", "Extended"],
    duration: 250,
    image: require("../../../assets/systemPresets/android/SystemNotificationError.png"),
    play: Presets.System.notificationError,
  },
  {
    name: "SystemNotificationSuccess",
    description: "Fallback implementation of iOS UINotificationFeedbackGenerator.success preset.",
    tags: ["iOS Fallback", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 160,
    image: require("../../../assets/systemPresets/android/SystemNotificationSuccess.png"),
    play: Presets.System.notificationSuccess,
  },
  {
    name: "SystemNotificationWarning",
    description: "Fallback implementation of iOS UINotificationFeedbackGenerator.warning preset.",
    tags: ["iOS Fallback", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 160,
    image: require("../../../assets/systemPresets/android/SystemNotificationWarning.png"),
    play: Presets.System.notificationWarning,
  },
  {
    name: "SystemPrimitiveClick",
    description: "VibrationEffect.Composition.PRIMITIVE_CLICK",
    tags: ["System", "Android", "Primitive", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 12,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveClickPreset.png"),
    play: Presets.System.Android.primitiveClick,
  },
  {
    name: "SystemPrimitiveLowTick",
    description: "VibrationEffect.Composition.PRIMITIVE_LOW_TICK",
    tags: ["System", "Android", "Primitive", "Gentle", "Flexible", "Impulses", "Impulse"],
    duration: 12,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveLowTickPreset.png"),
    play: Presets.System.Android.primitiveLowTick,
  },
  {
    name: "SystemPrimitiveQuickFall",
    description: "VibrationEffect.Composition.PRIMITIVE_QUICK_FALL",
    tags: ["System", "Android", "Primitive", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 100,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveQuickFallPreset.png"),
    play: Presets.System.Android.primitiveQuickFall,
  },
  {
    name: "SystemPrimitiveQuickRise",
    description: "VibrationEffect.Composition.PRIMITIVE_QUICK_RISE",
    tags: ["System", "Android", "Primitive", "Substantial", "Flexible", "Impulses", "Impulse"],
    duration: 155,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveQuickRisePreset.png"),
    play: Presets.System.Android.primitiveQuickRise,
  },
  {
    name: "SystemPrimitiveSlowRise",
    description: "VibrationEffect.Composition.PRIMITIVE_SLOW_RISE",
    tags: ["System", "Android", "Primitive", "Gentle", "Flexible", "Impulses", "Short"],
    duration: 505,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveSlowRisePreset.png"),
    play: Presets.System.Android.primitiveSlowRise,
  },
  {
    name: "SystemPrimitiveSpin",
    description: "VibrationEffect.Composition.PRIMITIVE_SPIN",
    tags: ["System", "Android", "Primitive", "Gentle", "Flexible", "Impulses", "Short"],
    duration: 150,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveSpinPreset.png"),
    play: Presets.System.Android.primitiveSpin,
  },
  {
    name: "SystemPrimitiveThud",
    description: "VibrationEffect.Composition.PRIMITIVE_THUD",
    tags: ["System", "Android", "Primitive", "Bold", "Flexible", "Impulses", "Impulse"],
    duration: 300,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveThudPreset.png"),
    play: Presets.System.Android.primitiveThud,
  },
  {
    name: "SystemPrimitiveTick",
    description: "VibrationEffect.Composition.PRIMITIVE_TICK",
    tags: ["System", "Android", "Primitive", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 5,
    image: require("../../../assets/systemPresets/android/SystemPrimitiveTickPreset.png"),
    play: Presets.System.Android.primitiveTick,
  },
  {
    name: "SystemRelease",
    description: "HapticFeedbackConstants.REJECT (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Bold", "Flexible", "Impulses", "Short"],
    duration: 170,
    image: require("../../../assets/systemPresets/android/SystemReleasePreset.png"),
    play: Presets.System.Android.release,
  },
  {
    name: "SystemScrollItemFocus",
    description: "HapticFeedbackConstants.SCROLL_ITEM_FOCUS (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemScrollItemFocusPreset.png"),
    play: Presets.System.Android.scrollItemFocus,
  },
  {
    name: "SystemScrollLimit",
    description: "HapticFeedbackConstants.SCROLL_LIMIT (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemScrollLimitPreset.png"),
    play: Presets.System.Android.scrollLimit,
  },
  {
    name: "SystemScrollTick",
    description: "HapticFeedbackConstants.SCROLL_TICK (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemScrollTickPreset.png"),
    play: Presets.System.Android.scrollTick,
  },
  {
    name: "SystemSegmentFrequentTick",
    description: "HapticFeedbackConstants.SEGMENT_FREQUENT_TICK (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemSegmentFrequentTickPreset.png"),
    play: Presets.System.Android.segmentFrequentTick,
  },
  {
    name: "SystemSegmentTick",
    description: "HapticFeedbackConstants.SEGMENT_TICK (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemSegmentTickPreset.png"),
    play: Presets.System.Android.segmentTick,
  },
  {
    name: "SystemSelection",
    description: "Fallback implementation of iOS UISelectionFeedbackGenerator.selection preset.",
    tags: ["iOS Fallback", "Gentle", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemSelection.png"),
    play: Presets.System.selection,
  },
  {
    name: "SystemTextHandleMove",
    description: "HapticFeedbackConstants.TEXT_HANDLE_MOVE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemTextHandleMovePreset.png"),
    play: Presets.System.Android.textHandleMove,
  },
  {
    name: "SystemToggleOff",
    description: "HapticFeedbackConstants.TOGGLE_OFF (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Flexible", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemToggleOffPreset.png"),
    play: Presets.System.Android.toggleOff,
  },
  {
    name: "SystemToggleOn",
    description: "HapticFeedbackConstants.TOGGLE_ON (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemToggleOnPreset.png"),
    play: Presets.System.Android.toggleOn,
  },
  {
    name: "SystemVirtualKey",
    description: "HapticFeedbackConstants.VIRTUAL_KEY (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Substantial", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemVirtualKeyPreset.png"),
    play: Presets.System.Android.virtualKey,
  },
  {
    name: "SystemVirtualKeyRelease",
    description: "HapticFeedbackConstants.VIRTUAL_KEY_RELEASE (Vendor-specific)",
    tags: ["System", "Android", "Vendor", "Gentle", "Rigid", "Impulses", "Impulse"],
    duration: 50,
    image: require("../../../assets/systemPresets/android/SystemVirtualKeyReleasePreset.png"),
    play: Presets.System.Android.virtualKeyRelease,
  },
];
