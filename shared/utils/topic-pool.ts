// Curated seed topics for the unattended auto-publishing script
// (scripts/daily-post.ts). Each entry pairs a story premise with a
// preferred category so automated posts stay spread across the site's
// existing category list (CATEGORY_SLUGS in ./story-authoring) instead of
// clustering. Once every entry here has been used (tracked in the
// Supabase `used_topics` table), the script falls back to asking the
// model to invent a fresh topic itself.
import type { CATEGORY_SLUGS } from './story-authoring'

export interface PoolTopic {
  topic: string
  category: (typeof CATEGORY_SLUGS)[number]
}

export const TOPIC_POOL: PoolTopic[] = [
  // adventure
  { topic: 'A young explorer who finds a map to a hidden waterfall in their own backyard', category: 'adventure' },
  { topic: 'Two siblings who build a raft and sail across a pond to a mysterious little island', category: 'adventure' },
  { topic: 'A kid who discovers an old treehouse that turns out to lead somewhere unexpected', category: 'adventure' },
  { topic: 'A group of friends on a camping trip who follow strange lights into the forest', category: 'adventure' },
  { topic: 'A child who gets lost in a corn maze and has to find their way out using clues', category: 'adventure' },
  { topic: 'A kid who sails a paper boat down a stream and imagines a grand ocean voyage', category: 'adventure' },
  { topic: 'A brave kid who climbs the tallest hill in town to watch a meteor shower', category: 'adventure' },
  { topic: 'A child exploring a grandparent\'s attic who finds an old compass that "always points to adventure"', category: 'adventure' },
  { topic: 'Kids who build a go-kart and race it down Main Street for the town fair', category: 'adventure' },
  { topic: 'A child who volunteers to be the navigator on a family road trip with no map', category: 'adventure' },

  // bedtime
  { topic: 'A little cloud who is afraid of the dark and learns the night sky is full of friends', category: 'bedtime' },
  { topic: 'A sleepy bear cub who does not want winter hibernation to end their fun', category: 'bedtime' },
  { topic: 'A child whose stuffed animal comes gently to life only after the lights go out', category: 'bedtime' },
  { topic: 'A little star who is too shy to shine until the moon encourages them', category: 'bedtime' },
  { topic: 'A kid who is scared of thunderstorms and learns to count the seconds until calm', category: 'bedtime' },
  { topic: 'A family of owls tucking their smallest owlet in for their very first night flight tomorrow', category: 'bedtime' },
  { topic: 'A blanket that is magic only at bedtime, wrapping a child in cozy dreams', category: 'bedtime' },
  { topic: 'A child who cannot sleep in a new house until they make friends with the creaky floorboards', category: 'bedtime' },
  { topic: 'The last lightning bug of summer, looking for one more friend before bedtime', category: 'bedtime' },
  { topic: 'A little fish who is afraid to sleep in the deep part of the pond', category: 'bedtime' },

  // animals
  { topic: 'A shy hedgehog who is afraid to unroll in front of the other forest animals', category: 'animals' },
  { topic: 'A baby elephant who is embarrassed by their too-big ears until they learn to fly with them (in imagination)', category: 'animals' },
  { topic: 'A stray cat who slowly learns to trust a family that keeps leaving out food', category: 'animals' },
  { topic: 'A slow tortoise who teaches a hurried rabbit that patience has its own rewards', category: 'animals' },
  { topic: 'A flock of geese where the smallest gosling insists on flying at the front', category: 'animals' },
  { topic: 'A city pigeon who dreams of seeing the countryside just once', category: 'animals' },
  { topic: 'A young octopus who is too shy to change colors in front of new friends', category: 'animals' },
  { topic: 'A farm dog who thinks it is their job to say goodnight to every single animal', category: 'animals' },
  { topic: 'A penguin chick who cannot slide down the ice hill as fast as the others', category: 'animals' },
  { topic: 'A squirrel who forgets where they buried their acorns and asks the forest for help', category: 'animals' },

  // friendship
  { topic: 'Two kids from different classes who become friends over a shared love of a silly joke', category: 'friendship' },
  { topic: 'A new kid at school who is nervous to make friends until someone shares their lunch table', category: 'friendship' },
  { topic: 'A child who learns to say sorry to a friend after a small disagreement over a game', category: 'friendship' },
  { topic: 'Two best friends who have to solve a small disagreement about whose turn it is', category: 'friendship' },
  { topic: 'A shy child who finally speaks up to invite someone to play at recess', category: 'friendship' },
  { topic: 'A kid who learns that being a good friend sometimes means cheering for someone else\'s win', category: 'friendship' },
  { topic: 'Pen pals from two different towns who finally meet for the first time', category: 'friendship' },
  { topic: 'A child who helps a friend who is left out find a place in the group', category: 'friendship' },
  { topic: 'Two rival classmates who end up as partners for a school project and become friends', category: 'friendship' },
  { topic: 'A kid who shares their favorite toy with a friend who is having a hard day', category: 'friendship' },

  // fairy-tale
  { topic: 'A young apprentice witch whose spells always turn out a little bit wrong, but helpfully so', category: 'fairy-tale' },
  { topic: 'A small dragon who is afraid of their own fire and learns to use it to warm, not scare', category: 'fairy-tale' },
  { topic: 'A kingdom where the youngest princess would rather fix things than wear a crown', category: 'fairy-tale' },
  { topic: 'A gentle giant who just wants to plant flowers instead of stomping through the village', category: 'fairy-tale' },
  { topic: 'A magic seed that grows a different wonder each night, and the child who tends it', category: 'fairy-tale' },
  { topic: 'A talking river who guides a lost child home in exchange for a kind favor', category: 'fairy-tale' },
  { topic: 'A young knight-in-training who wins the day with cleverness instead of a sword', category: 'fairy-tale' },
  { topic: 'A fairy who lost her wings and learns that kindness can be its own kind of magic', category: 'fairy-tale' },
  { topic: 'A cursed music box that only plays happy songs once someone truly needs one', category: 'fairy-tale' },
  { topic: 'A village where wishes come true, but only the small, kind ones', category: 'fairy-tale' },

  // funny
  { topic: 'A kid whose pet goldfish seems to be secretly training for the Olympics', category: 'funny' },
  { topic: 'A family whose Sunday pancake breakfast goes hilariously wrong in every possible way', category: 'funny' },
  { topic: 'A dog who is convinced the vacuum cleaner is their biggest rival', category: 'funny' },
  { topic: 'A kid who tries to invent a machine that ties shoelaces and it does everything but that', category: 'funny' },
  { topic: 'A classroom hamster who escapes and turns the whole school into an accidental treasure hunt', category: 'funny' },
  { topic: 'A child who insists their socks keep going missing because of a "sock-eating monster" under the bed', category: 'funny' },
  { topic: 'Two siblings who try to build the world\'s messiest blanket fort and it collapses at the worst moment', category: 'funny' },
  { topic: 'A parrot who learned exactly the wrong words to repeat at the worst possible times', category: 'funny' },
  { topic: 'A kid convinced their little sibling is secretly a superhero because of one very lucky coincidence', category: 'funny' },
  { topic: 'A family pet who "helps" with every chore in the most unhelpful way imaginable', category: 'funny' }
]
