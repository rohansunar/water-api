var twoSum = function(nums, target) {
    let arr = [];
    let seen = [];

    for(var i=0;i<nums.length;i++){

        var reminder = target - nums[i];
        if(reminder === nums[i+1]){
            return [i,i+1];
        }else {
            seen.push(i+1);
        }
        // if(indexOf(seen[nums(i)])<0
        // console.log(nums[i])
        // for(var j=i+1;j<nums.length;j++){
        //     var sum = nums[i]+nums[j]
        //     if(sum === target){
        //         arr.push(nums[i])
        //         arr.push(nums[j])
        //     }
        // }
    }
    return arr;
};

console.log(twoSum([2,6,7,11,15],9));