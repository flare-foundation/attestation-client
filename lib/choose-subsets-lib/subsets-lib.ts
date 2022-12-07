const SUBGROUP_TO_BIG_ERROR = "Groups can ony have subgroups whose size is smaller or equal to original group's size";

export function countOnes(num: number){
  let sum = 0;

}

export function chooseCandidate(votes: number[], groupSize: number) {
  if (votes.length < groupSize) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }

  const allSubsets = getSubsetsOfSize(votes, groupSize);

  const candidates = []

  for(const subset of allSubsets){
    let candidate = subset[0]
    for(const elem of subset){
      candidate = candidate & elem
    }
    candidates.push(candidate)
  }

  return candidates
}

export function getSubsetsOfSize(array: any[], size: number) {
  if (array.length < size) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }

  const result = [];

  function helper(arr: any[], splitIndex: number) {
    if (arr.length === size) {
      result.push(arr);
      return;
    }
    if (splitIndex + 1 > array.length) {
      return;
    }
    // We only want to explore the "tree" if we can find sufficient size elements down there
    const subtreeSizes = arr.length + array.length - splitIndex;
    if (subtreeSizes >= size) {
      helper(arr.concat(array[splitIndex]), splitIndex + 1);
      if (subtreeSizes > size) {
        helper(arr, splitIndex + 1);
      }
    }
  }

  helper([], 0);
  return result;
}