import { useState } from "react";
import { Text, View } from "react-native";
import { Label, Pill, PrimaryButton } from "@emappa/ui";
import { TokenBalanceHero } from "../../shared";
import type { PrepaidCommitment } from "@emappa/shared";
import { pledgeStatusTone } from "../homeownerWalletLogic";
import {
  EmbeddedIconBadge,
  EmbeddedRow,
  EmbeddedWhiteCard,
  HomeownerEmbeddedFrame,
} from "../homeownerEmbeddedUi";
import { formatKes, formatStage, type HomeownerSnapshot } from "../homeownerSnapshot";

export function HomeownerPledgeDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Pledge" subtitle="Edit or cancel before go-live. Pledges are non-binding until activation.">
      {(snapshot) => <PledgeDetailBody snapshot={snapshot} />}
    </HomeownerEmbeddedFrame>
  );
}

function PledgeDetailBody({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const isLive = snapshot.building!.stage === "live";
  const pledgedKes = snapshot.balance?.confirmedTotalKes ?? 0;
  const [selectedId, setSelectedId] = useState(snapshot.pledgeHistory[0]?.id ?? null);
  const selected = snapshot.pledgeHistory.find((item) => item.id === selectedId) ?? snapshot.pledgeHistory[0] ?? null;

  return (
    <>
      <TokenBalanceHero
        eyebrow="Pledge stream"
        title={isLive ? "Confirmed pledge balance" : "Pre-live pledge (non-binding)"}
        subtitle="No money moves at onboarding. Tokens unlock only after LBRS go-live."
        kesValue={formatKes(pledgedKes)}
        disabled={!isLive && pledgedKes === 0}
      />
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="wallet-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>Pledge detail</Text>
        <Text style={{ color: "#7a6558", fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
          Increase, decrease, or cancel a pledge until the project activates. This is a project contribution record, not
          deliverable kWh before live commissioning.
        </Text>
        {selected ? <PledgeEditor pledge={selected} isLive={isLive} /> : <Text style={{ color: "#7a6558" }}>No pledges recorded yet.</Text>}
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>History</Label>
        {snapshot.pledgeHistory.length === 0 ? (
          <Text style={{ color: "#7a6558" }}>No pledge history returned.</Text>
        ) : (
          snapshot.pledgeHistory.map((item) => (
            <PledgeHistoryRow
              key={item.id}
              item={item}
              selected={item.id === selected?.id}
              onSelect={() => setSelectedId(item.id)}
            />
          ))
        )}
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <Label>Project stage</Label>
        <EmbeddedRow label="Stage" value={formatStage(snapshot.building!.stage)} note="Pledges stay editable until go-live." />
      </EmbeddedWhiteCard>
    </>
  );
}

function PledgeEditor({ pledge, isLive }: { pledge: PrepaidCommitment; isLive: boolean }) {
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <EmbeddedRow label="Amount" value={formatKes(pledge.amountKes)} note={pledge.paymentMethod} />
      <EmbeddedRow label="Status" value={pledge.status} note={new Date(pledge.createdAt).toLocaleDateString()} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pill tone={pledgeStatusTone(pledge.status)}>{pledge.status}</Pill>
        {!isLive ? <Pill tone="warn">Editable pre-live</Pill> : null}
      </View>
      {!isLive ? (
        <View style={{ gap: 8 }}>
          <PrimaryButton onPress={() => undefined}>Increase pledge</PrimaryButton>
          <PrimaryButton onPress={() => undefined}>Decrease pledge</PrimaryButton>
          <PrimaryButton onPress={() => undefined}>Cancel pledge</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: "#7a6558", fontSize: 12, fontWeight: "600" }}>
          Post go-live, contact support to adjust confirmed pledge balances.
        </Text>
      )}
    </View>
  );
}

function PledgeHistoryRow({
  item,
  selected,
  onSelect,
}: {
  item: PrepaidCommitment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(150,90,53,0.12)", paddingVertical: 10 }}>
      <EmbeddedRow
        label={formatKes(item.amountKes)}
        value={selected ? "Selected" : "View"}
        note={`${item.paymentMethod} · ${new Date(item.createdAt).toLocaleDateString()}`}
      />
      <PrimaryButton onPress={onSelect}>{selected ? "Editing" : "Select"}</PrimaryButton>
    </View>
  );
}
