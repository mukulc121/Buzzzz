The DexTourLoader sample comes from [headout/dex-ios PR #1063](https://github.com/headout/dex-ios/pull/1063), commit `04153623238828effc233792626e629cd7c0ec01`. The Rive asset is unchanged at 231,444 bytes, SHA256 `a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6`.

The haptic profile follows [PR #1069](https://github.com/headout/dex-ios/pull/1069), commit `ed09e5dcd2a24b56f8df48877707dd24fb719e31`, in `packages/dex/src/hooks/useDexTourLoaderHaptics.ts` and `packages/dex/src/components/dexTourLoaderTiming.ts`. The Rive asset is unchanged between these revisions. This source attribution does not grant a separate license for the Headout asset.

The play clock starts EngineRev at 400 ms, then Drone at 2,200 ms with time scale 0.89, gain 2.5 and sharpness boost 0.15. With the sample's automatic readiness at 2,500 ms, Drone stops at 3,740 ms, Lock starts at 3,940 ms and the scene completes at 4,440 ms. Rive's haptic triggers only mark phases; missing callbacks cannot suppress the ending. The chart renders these actual Pulsar preset patterns, including the clipped Drone envelope.

Unedited copies of the earlier PR #1063 tap script upgrade to this profile. Edited configurations remain unchanged. Source tests verify the script and preset data; they do not establish tactile equivalence to an installed Dex build.

The native preview disables the SDK's synthetic sound, matching Dex's release default.
