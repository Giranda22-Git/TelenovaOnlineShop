<template>
  <div id="app">
    <div class="form">
      <label for="file">{{ filename }}</label>
      <input style="display: none" id="file" type="file" name="files" @change="handleFileUpload()" ref="file" multiple="true">
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
    images: [],
    productKaspiId: '100098508', // Фото- и видеокамеры
    categoryName: 'Фото- и видеокамеры',
    typeOfPromo: 1,
    bigPromoText: 'asdadascdssd',
    timeOfPromoEnding: '2021-08-21T23:07:04.895Z',
    sale: 20,
    resData: null
  }),
  methods: {
    handleFileUpload () {
      if (this.$refs.file.files.length === 0) this.images = []
      else {
        this.images = this.$refs.file.files
        this.filename = this.images[0].name
      }
    },
    async sendFile () {
      if (this.images) {
        const formData = new FormData()
        this.images.forEach(file => {
          formData.append('files', file)
        })
        formData.append('productKaspiId', this.productKaspiId)
        formData.append('typeOfPromo', this.typeOfPromo)
        formData.append('bigPromoText', this.bigPromoText)
        formData.append('timeOfPromoEnding', this.timeOfPromoEnding)
        formData.append('sale', this.sale)
        console.log(this.images)
        await axios.post('http://localhost:3001/promoAction/',
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
        this.images = []
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
