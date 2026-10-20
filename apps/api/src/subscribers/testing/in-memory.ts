import type {
  KnownPerson,
  LaunchSignupRow,
  LetterSubscriberRow,
  SizeAlertRow,
  SubscribersReadModel,
} from "../application/ports";

export class MemorySubscribers implements SubscribersReadModel {
  letters: LetterSubscriberRow[] = [];
  launches: LaunchSignupRow[] = [];
  alerts: SizeAlertRow[] = [];
  people: KnownPerson[] = [];

  async letterSubscribers() {
    return this.letters;
  }
  async launchSignups() {
    return this.launches;
  }
  async sizeAlerts() {
    return this.alerts;
  }
  async knownPeople() {
    return this.people;
  }
}
