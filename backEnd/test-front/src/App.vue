<template>
  <div id="app">
    <div class="form">
      <input type="text" v-model="category" placeholder="category name">
      <label for="file">{{ filename }}</label>
      <input style="display: none" id="file" type="file" name="files" @change="handleFileUpload()" ref="file">
      <button @click="sendFile">Send</button>
    </div>
    {{ resData }}
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'App',
  data: () => ({
    filename: 'Выберите файл',
    image: null,
    category: '',
    resData: null
  }),
  methods: {
    handleFileUpload () {
      if (this.$refs.file.files.length === 0) this.image = null
      else {
        this.image = this.$refs.file.files[0]
        this.filename = this.image.name
      }
    },
    async sendFile () {
      if (this.image) {
        const formData = new FormData()
        formData.append('file', this.image)
        formData.append('category', this.category)
        console.log(this.image)
        await axios.post('http://localhost:3001/categoryTree/addImage',
          formData
        )
          .then(response => {
            console.log(response.data !== null)
            if (response.data !== null) {
              this.resData = response.data
            }
          })
          .catch(err => {
            console.log(err)
          })
        this.image = null
        this.filename = 'Выберите файл'
      }
    }
  }
}
</script>

<style lang="sass">
  *
    box-sizing: border-box
  body
    margin: 0
    padding: 0
  #app
    width: 100vw
    height: 100vh
    display: flex
    justify-content: center
    align-items: center
    .form
      width: 50%
      height: 50%
      display: flex
      flex-direction: column
      justify-content: space-evenly
      align-items: center
</style>
